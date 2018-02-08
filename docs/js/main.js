//jshint esversion: 6, asi: true, loopfunc: true
class Scenario {
    constructor(name, upgraded, available_plants){
        this.name = name
        this.upgraded = upgraded
        this.upgrade_cost = upgraded.length * 10000000
        this.available_plants = available_plants
        this.customers = []
        this.plants = []
        this.demands = []
        this.profit = 0
        this.transport_cost = 0
        this.revenue = 0
        this.production_cost = 0
        this.setup_cost = 0
        this.quarter = 1
    }
    plan(){
        //assign production plan and target production amount to each plant
        var sorted_demands = _.sortBy(this.demands, d=>-get_marginal_profit(d, this.plants, this.available_plants))
            function get_marginal_profit(demand, plants, available_plants){
                //All available plants in this scenario sorted by the distance
                var production_cost_per_ton = (6-demand.product_id)*100
                // var plant_choices = available_plants[demand.product_id]
                var plant_choices = plants.filter(d=>available_plants[demand.product_id].includes(d.plant_id)).map(d=>{
                    d.dist = _.find(data.dist_p2c, v=>v.customer_id==demand.customer_id && v.plant_id==d.plant_id).dist
                    return d
                })

                //Calculate possible profit for each available plant and sort by largest to smallest profit
                var profit = _.sortBy(
                    plant_choices.map(d=> {
                        d.profit = (demand.revenue * demand.quarterly_demand_reamining - d.dist*2*Math.ceil(demand.quarterly_demand_reamining/10) - production_cost_per_ton * demand.quarterly_demand_reamining)
                        return d
                    }),d=>-d.profit)
                //plants possible is ordered in profit
                demand.plants_possible = profit.map(d=>d.plant_id)
                // console.log(`Product ${demand.product_id}, Customer ${demand.customer_id}, Demand: ${demand.quarterly_demand_reamining}, Profit: ${profit[0].profit}`)
                if (profit.length > 1){
                    return profit[0].profit - profit[1].profit
                } else {
                    return 1e9
                }
            }
        for (let demand of sorted_demands){
            //For product 4 and 5, simply assign to plant 4 and only in Q1
            var assigned_plant = 0
            if (demand.product_id >=4){
                if (this.quarter == 1){
                    this.plants[3].target_fulfillment[3] = _.sum(this.demands.filter(d=>d.product_id==4).map(d=>d.demand))
                    this.plants[3].target_fulfillment[4] = _.sum(this.demands.filter(d=>d.product_id==5).map(d=>d.demand))
                    assigned_plant = this.plants[3]
                    demand.assigned_plant_id = 4
                    demand.dist = assigned_plant.get_distance_to_customers(demand.customer_id)
                    assigned_plant.target_fulfillment[demand.product_id-1] += demand.demand
                }

            } else {
                //Check if plant can handle the demand.
                for (let plant_id of demand.plants_possible){
                    var plant_candidate = _.find(this.plants, d=>d.plant_id == plant_id)
                    if (plant_candidate.capacity_remaining_quarterly[demand.product_id] >= demand.quarterly_demand_reamining &&
                        plant_candidate.production_remaining_quarterly >= demand.quarterly_demand_reamining){

                        //Reduce planned capacity and production
                        assigned_plant = plant_candidate
                        assigned_plant.capacity_remaining_quarterly[demand.product_id] -= demand.quarterly_demand_reamining
                        assigned_plant.production_remaining_quarterly -= demand.quarterly_demand_reamining
                        demand.assigned_plant_id = assigned_plant.plant_id
                        demand.dist = assigned_plant.get_distance_to_customers(demand.customer_id)
                        break;
                    }
                }
                assigned_plant.target_fulfillment[demand.product_id-1] += demand.quarterly_demand_reamining
            }
        }


    }

    //We should only deliver once each quarter, since it theoretically takes one day
    //TODO: Combine shipments
    deliver(){
        this.q_revenue = 0
        this.q_profit = 0
        this.q_production_cost = 0
        this.q_transport_cost = 0
        this.q_setup_cost = 0
        // //Delivery
        // //The idea is that we assign each plant to fulfill demand at the end of quarter
        // TODO: Combine shipments to customers
        for (let demand of this.demands){
            var assigned_plant = _.find(this.plants, d=>d.plant_id==demand.assigned_plant_id)
            if (demand.quarterly_demand_reamining - assigned_plant.inventory[demand.product_id-1]  <= 1e-3){
                var fulfilled_tons = demand.quarterly_demand_reamining
                assigned_plant.inventory[demand.product_id-1] -= fulfilled_tons
                var revenue = demand.revenue * fulfilled_tons
                var transport_cost = Math.ceil(fulfilled_tons / 10) * 2 * demand.dist
                assigned_plant.transport_cost += transport_cost
                this.q_revenue += revenue
                this.q_transport_cost += transport_cost

            } else {
                console.log(`Product ${demand.product_id} for Customer ${demand.customer_id} could not be fulfilled by the Plant ${demand.assigned_plant_id}`)
            }
            

            //Display fulfillment
            if (fulfilled_tons > 0){
                // console.log(`From Plant ${assigned_plant.plant_id} fulfilled Customer ${demand.customer_id} Product ${demand.product_id} ${fulfilled_tons} tons` )
            }
        }

        this.q_production_cost = _.sum(this.plants.map(d=>d.production_cost))
        this.q_setup_cost = _.sum(this.plants.map(d=>d.setup_cost))
        this.q_profit = this.q_revenue - this.q_profit - this.q_transport_cost - this.q_setup_cost

        this.transport_cost += this.q_transport_cost
        this.revenue += this.q_revenue
        this.production_cost += this.q_production_cost
        this.setup_cost += this.q_setup_cost
        this.profit = this.revenue - this.transport_cost - this.production_cost - this.setup_cost - this.upgrade_cost
    }
}

class Demand {
    constructor(product_id, customer_id, demand){
        this.product_id = product_id
        this.customer_id = customer_id
        this.demand = demand
        this.revenue = this.customer_id >= 40 ? 1200 : 1000
        this.reset_quarterly()
    }
    reset_quarterly(){
        this.quarterly_demand_reamining = this.demand / 4
    }
}

// Establish classes for object-oriented programming approach
class Customer {
    constructor(customer_id, city, state, lat, long){
        this.customer_id = customer_id
        this.city = city
        this.state = state
        this.lat = lat
        this.long = long
        this.dist_p2c = data.dist_p2c.filter(d=>d.customer_id==this.customer_id)
        this.dist_c2c = data.dist_c2c.filter(d=>d.customer_from==this.customer_id)
    }
    get customers_within_500(){
        return this.dist_c2c.filter(d=>d.dist <= 500).map(d=>d.customer_to)
    }
    closest_plant(){
        return _.minBy(this.dist_p2c, d=>d.dist)
    }
    get_distance_to_plants(plant_id){
        //If plant id not provided, return all plants
        if (plant_id=== undefined){
            return this.dist_p2c
        } else {
            return _.find(this.dist_p2c, d => d.plant_id == plant_id).dist
        }
    }
    get_distance_to_customers(customer_id){
        if (customer_id=== undefined){
            return this.dist_c2c
        } else {
            return _.find(this.dist_c2c, d => d.customer_to == customer_id).dist
        }
    }
}

class Plant {
    constructor(plant_id, city, state, lat, long){
        this.plant_id = plant_id
        this.city = city
        this.state = state
        this.lat = lat
        this.long = long
        this.dist_p2c = data.dist_p2c.filter(d=>d.plant_id==this.plant_id)
        this.current_product = this.plant_id
        this.production_rate = this.plant_id == 1 ? 100 : 50
        this.inventory = [0,0,0,0,0]
        this.reset_quarterly()
    }
    get customers_within_500(){
        return this.dist_p2c.filter(d=>d.dist <= 500).map(d=>d.customer_id)
    }
    get production_cost_per_ton(){
        return (6-this.current_product)*100
    }
    get utilization_rate(){
        return d3.format(".2%")(this.quarterly_production / (this.production_rate * 8 * (90 - (this.setup_cost/5000) )))
    }
    reset_quarterly(){
        this.revenue = 0
        this.transport_cost = 0
        this.production_cost = 0
        this.setup_cost = 0
        this.days_remaining_quarterly = 90
        this.setup_days = 0
        this.overtime = false
        this.overtime_hours = 0
        this.quarterly_production = 0
        this.target_fulfillment = [0,0,0,0,0]
        this.capacity = {}
        this.production_remaining_quarterly = this.production_rate * 12 * this.days_remaining_quarterly
        data.capacity.filter(d=>d.plant_id == this.plant_id).map(d=>{
            this.capacity[d.product_id] = d.capacity / 4
        })
        this.capacity_remaining_quarterly = _.clone(this.capacity)
    }
    get_distance_to_customers(customer_id){
        //If customer id not provided, return all customers
        if (customer_id=== undefined){
            return this.dist_p2c
        } else {
            return _.find(this.dist_p2c, d=>d.customer_id==customer_id).dist
        }
    }
    work_overtime(){
        this.overtime = true
    }
    switch_product(to){
        var setup_days = _.find(data.setup, d=> d.from == this.current_product && d.to==to).days
        this.current_product = to
        this.days_remaining_quarterly -= setup_days
        this.setup_days = setup_days
        this.setup_cost += (setup_days * 5000)
    }
    produce(){
        //Produce for one day
        this.days_remaining_quarterly -= 1

        var hours_left = 8

        // If setting up, skip producing
        if (this.setup_days>0){
            // console.log(`Plant ${this.plant_id} setting up to ${this.current_product}...`)
            this.setup_days -= 1

        //Only for [1,2,3], because we'll finish annaul demand for plant 4 and 5 in one quarter
        } else if([1,2,3].includes(this.current_product) && this.capacity[this.current_product] <= 0){
            console.log(`Plant ${this.plant_id} reached max quarterly capacity for Product ${this.current_product}`)
        } else {

            if (this.plant_id == 4){   
                var tons_made = Math.min(8*this.production_rate, this.target_fulfillment[this.current_product-1])
            } else {
                //Tons produced
                var tons_made = Math.min(8*this.production_rate, this.target_fulfillment[this.current_product-1], this.capacity[this.current_product])
            }

            this.quarterly_production += tons_made

            //Add produced items to inventory
            this.inventory[this.current_product-1] += tons_made

            //Add production cost
            this.production_cost += this.production_cost_per_ton * tons_made

            //Reduce capacity
            this.capacity[this.current_product] -= tons_made

            //Reduce target number
            this.target_fulfillment[this.current_product-1] -= tons_made 

            if (this.overtime && this.target_fulfillment[this.current_product-1]>0){
                var overtime_production = Math.min(4 * this.production_rate, this.target_fulfillment[this.current_product-1], this.capacity[this.current_product])
                this.quarterly_production += overtime_production
                this.inventory[this.current_product-1] += overtime_production
                this.production_cost += this.production_cost_per_ton * 1.5 * overtime_production
                this.capacity[this.current_product] -= overtime_production
                this.target_fulfillment[this.current_product-1] -= overtime_production 
                this.overtime_hours += overtime_production/this.production_rate
            }
        }
    }
}

data = {}
data.demand = demand_input
data.plants = plants_input
data.setup = setup_input
data.customers = customers_input
data.capacity = capacity_input
data.dist_c2c = dist_c2c
data.dist_p2c = dist_p2c

preprocessing()

data.clusters = demand_covered()
data.after_warehouse_percent = iterate_combinations()


function formatNum(number){
    return d3.format(".5s")(number)
}   

scenarios = []

//Initialize list of Demand, Customer, Plant classes
var demands = data.demand.map(d=>new Demand(d.product_id, d.customer_id, d.demand))
var customers = data.customers.map(d=>new Customer(d.customer_id, d.city, d.state, d.lat, d.long))
var plants = data.plants.map(d=>new Plant(d.plant_id, d.city, d.state, d.lat, d.long))

// baseline scenario
var baseline = new Scenario('baseline', [], {1: [1], 2: [2], 3: [3], 4: [4], 5: [4]})
baseline.customers = _.cloneDeep(customers)
baseline.demands = _.cloneDeep(demands)
baseline.plants = _.cloneDeep(plants)
scenarios.push(baseline)

// Upgrading 123 scenario. 
var upgrade_123 = new Scenario('upgrade_123', [1,2,3], {1: [1,2,3], 2: [1,2,3], 3: [1,2,3], 4: [4], 5: [4]})
upgrade_123.customers = _.cloneDeep(customers)
upgrade_123.demands = _.cloneDeep(demands)
upgrade_123.plants = _.cloneDeep(plants)
scenarios.push(upgrade_123)

    function simulate_fulfillment(scenario){
        //4 quarters. 5 Products. 4 Plants.
        for (let quarter=1;quarter<=4;quarter++){
            scenario.quarter = quarter

            for (let plant of scenario.plants){
                plant.reset_quarterly()
            }
            scenario.plan()
            var plant_1 = scenario.plants[0]
            var plant_2 = scenario.plants[1]
            var plant_3 = scenario.plants[2]
            var plant_4 = scenario.plants[3]

            //Simulate each day
            for (let day=1;day<=90;day++) {                
                //baseline scenario. There's no switching, except when plant 4 is done making and meeting product 4 demands. Overtime is required for plant 1 for 5 days each
                if (scenario.name =='baseline'){
                    // Plant 1 needs to run overtime for five days, assuming only four hours of overtime per day is available.
                    if (day>=86 && plant_1.overtime === false){
                        plant_1.work_overtime()
                    }

                    //If plant 4 fulfilled product 4 demand, switch to 5
                    if (plant_4.target_fulfillment[3] === 0 && plant_4.current_product == 4 && quarter == 1){
                        plant_4.switch_product(5)
                    }

                    //All plants get to work
                    plant_1.produce()
                    plant_2.produce()
                    plant_3.produce()

                    //Plant 4 only works in Q1
                    if (quarter==1 && _.sum(plant_4.target_fulfillment)>0){
                        plant_4.produce()
                    }
                }

                // Keep plant 4 and product 4/5 fulfilment strategy the same as baseline.
                // Switching from 3 to 2/4 or 2 to 3/4 is costly, so it would be 2 to 1 and back to 2. Same for 3
                else if (scenario.name == 'upgrade_123'){

                    if (plant_2.overtime === false){
                        if (day==73 && quarter ==1){
                            plant_2.work_overtime()
                        } else if ((day == 70) && (quarter == 2)){
                            plant_2.work_overtime()
                        } else if ((day == 80) && (quarter == 4)){
                            plant_2.work_overtime()
                        }

                    }

                    if ((day==88) && (plant_3.overtime === false) && ([2,3].includes(quarter))){
                        plant_3.work_overtime()
                    }

                    //If plant 4 fulfilled product 4 demand, switch to 5
                    if (plant_4.target_fulfillment[3] === 0 && (plant_4.current_product == 4) && (quarter == 1)){
                        plant_4.switch_product(5)
                    }

                    //Cycle through
                    for (let plant of [0,1,2]){
                        if ((scenario.plants[plant].target_fulfillment[0] === 0) && (scenario.plants[plant].target_fulfillment[1] > 0) && (scenario.plants[plant].current_product == 1)){
                            scenario.plants[plant].switch_product(2)
                        }
                        if ((scenario.plants[plant].target_fulfillment[1] === 0) && (scenario.plants[plant].target_fulfillment[2]) > 0 && (scenario.plants[plant].current_product == 2)){
                            scenario.plants[plant].switch_product(3)
                        }
                        if ((scenario.plants[plant].target_fulfillment[2] === 0) && (scenario.plants[plant].target_fulfillment[0]) > 0 && (scenario.plants[plant].current_product == 3)){
                            scenario.plants[plant].switch_product(1)
                        }
                    }
                    //All plants get to work
                    plant_1.produce()
                    plant_2.produce()
                    plant_3.produce()
                    if (quarter==1 && _.sum(plant_4.target_fulfillment)>0){
                        plant_4.produce()
                    }
                }       
            }
            scenario.deliver()

            // check if there is any demand unmet in this quarter. If that's the case, the scenario failed.
            console.log(`Remaining demands at the end of Q${quarter}
                    Product 1: ${d3.format(".2f")(_.sum(scenario.plants.map(d=>d.target_fulfillment[0])))}
                    Product 2: ${d3.format(".2f")(_.sum(scenario.plants.map(d=>d.target_fulfillment[1])))}
                    Product 3: ${d3.format(".2f")(_.sum(scenario.plants.map(d=>d.target_fulfillment[2])))}
                    Product 4: ${d3.format(".2f")(_.sum(scenario.plants.map(d=>d.target_fulfillment[3])))}
                    Product 5: ${d3.format(".2f")(_.sum(scenario.plants.map(d=>d.target_fulfillment[4])))}
                    Utilization Rate / Production Cost / Transport Cost / Overtime Hours / Inventory
                    Plant 1: ${plant_1.utilization_rate} / ${formatNum(plant_1.production_cost)} / ${formatNum(plant_1.transport_cost)} / ${d3.format(".2f")(plant_1.overtime_hours)} / ${plant_1.inventory.map(d=>d3.format(".2f")(d))}
                    Plant 2: ${plant_2.utilization_rate} / ${formatNum(plant_2.production_cost)} / ${formatNum(plant_2.transport_cost)} / ${d3.format(".2f")(plant_2.overtime_hours)} / ${plant_2.inventory.map(d=>d3.format(".2f")(d))}
                    Plant 3: ${plant_3.utilization_rate} / ${formatNum(plant_3.production_cost)} / ${formatNum(plant_3.transport_cost)} / ${d3.format(".2f")(plant_3.overtime_hours)} / ${plant_3.inventory.map(d=>d3.format(".2f")(d))}
                    Plant 4: ${plant_4.utilization_rate} / ${formatNum(plant_4.production_cost)} / ${formatNum(plant_4.transport_cost)} / ${d3.format(".2f")(plant_4.overtime_hours)} / ${plant_4.inventory.map(d=>d3.format(".2f")(d))}`)
        }
    }
for (let scenario of scenarios){
    simulate_fulfillment(scenario)
    data[scenario.name] = {
        revenue: scenario.revenue,
        profit: scenario.profit,
        transport_cost: scenario.transport_cost,
        setup_cost: scenario.setup_cost,
        upgrade_cost: scenario.upgrade_cost,
        production_cost: scenario.production_cost,
    }
    console.log(`Scenario ${scenario.name}
        Profit: ${formatNum(scenario.profit)} 
        Revenue: ${formatNum(scenario.revenue)} 
        Production Cost: ${formatNum(scenario.production_cost)} 
        Transportation Cost: ${formatNum(scenario.transport_cost)} 
        Setup Cost: ${formatNum(scenario.setup_cost)} 
        Upgrade Cost: ${formatNum(scenario.upgrade_cost)}`)
}

    // var text = d3.select("#summary")
    //              .append("div")
    //              .selectAll(".summary")
    //              .data([1,2,3,4,5])

    // text.enter()
    //     .append("text")
    //     .attr("class", "summary")
    //     .attr("dy", d=>d)
    //     .attr("x", 0)
    //     .html(function(product_id){
    //         return '<span style="font-size: 14px">Product '+ product_id+ 
    //             ' / Total Q Demand: '+total_demand(product_id) / 4 +
    //              ' / 500-mile Coverage: '+d3.format(".2%")(coverage_500[product_id-1]) + ' / With warehouses: '+d3.format(".2%")(data.after_warehouse_percent[product_id-1])+
    //              '</span><br>'
    //     })


    // var svg2 = d3.select("body").append("svg"),
    //       margin = {top: 20, right: 20, bottom: 30, left: 70},
    //       width2 = svgWidth - margin.left - margin.right,
    //       height2 = 1000 - margin.top - margin.bottom
    // svg2.attr("width", width2)
    //     .attr("height", height2)

    // projection = d3.geoAlbers()
    //                    .translate([width2/2, height2/2])
    //                    .scale([1500])
    // var path = d3.geoPath(projection)

    // x2 = d3.scaleLinear().rangeRound([0+100, width2 - 100])
    // y2 = d3.scaleLinear().rangeRound([height2 - 100, 0+100])

    // x2.domain(d3.extent(data.customers.map(d=>d.long)))
    // y2.domain(d3.extent(data.customers.map(d=>d.lat)))
    
    // var tip_circle = d3.tip().attr("class", "d3-tip").html(
    //     function(d){
    //     return `Customer ${d.customer_id} <br>
    //             ${d.city} ${d.state} <br>
    //             Product 1: ${d3.format(".2f")(_.find(data.demand, v=>v.customer_id==d.customer_id && v.product_id == 1).demand)} <br>
    //             Product 2: ${d3.format(".2f")(_.find(data.demand, v=>v.customer_id==d.customer_id && v.product_id == 2).demand)} <br>
    //             Product 3: ${d3.format(".2f")(_.find(data.demand, v=>v.customer_id==d.customer_id && v.product_id == 3).demand)} <br>
    //             Product 4: ${d3.format(".2f")(_.find(data.demand, v=>v.customer_id==d.customer_id && v.product_id == 4).demand)} <br>
    //             Product 5: ${d3.format(".2f")(_.find(data.demand, v=>v.customer_id==d.customer_id && v.product_id == 5).demand)} <br>
    //             Plant 1: ${d3.format(".2f")(_.find(data.dist_p2c, v=>v.customer_id==d.customer_id && v.plant_id == 1).dist)} <br>
    //             Plant 2: ${d3.format(".2f")(_.find(data.dist_p2c, v=>v.customer_id==d.customer_id && v.plant_id == 2).dist)} <br>
    //             Plant 3: ${d3.format(".2f")(_.find(data.dist_p2c, v=>v.customer_id==d.customer_id && v.plant_id == 3).dist)} <br>
    //             Plant 4: ${d3.format(".2f")(_.find(data.dist_p2c, v=>v.customer_id==d.customer_id && v.plant_id == 4).dist)} <br>
    //             `
    //     })
    // // d3.json("us-states.json", (error, json)=>{
    // //     if (error) throw error
    // //     svg2.selectAll("path")
    // //         .data(json.features).enter()
    // //         .append("path")
    // //         .attr("d", path)
    // //         .style("stroke", "#fff")
    // //         .style("stroke-width", "1")
    // //         .style("opacity", 0.3)

    // //     svg2.selectAll("circle")
    // //         .data(data.customers)
    // //         .enter()
    // //         .append("circle")
    // //         .attr("cx", function(d){return projection([d.long, d.lat])[0]})
    // //         .attr("cy", function(d){return projection([d.long, d.lat])[1]})
    // //         .attr("r", 3)
    // //         .style("fill", "steelblue")
    // //         .attr("id", d=>"circle_"+d.customer_id)
    // //         .on('mouseover', tip_circle.show)
    // //         .on('mouseout', tip_circle.hide)

    // //     svg2.selectAll("text.plant")
    // //         .data(data.plants)
    // //         .enter()
    // //         .append("text")
    // //         .attr("class", "plant")
    // //         .attr("x", function(d){return projection([d.long, d.lat])[0]})
    // //         .attr("y", function(d){return projection([d.long, d.lat])[1]})
    // //         .text(function(d){return d.plant_id})
    // //         .style("cursor", "default")
    // //         .style("font-size", "10px")

    // //     svg2.call(tip_circle)
    // //     svg2.selectAll("text.cluster")
    // //         .data(data.clusters)
    // //         .enter()
    // //         .append("text")
    // //         .attr("class", "cluster")
    // //         .attr("x", 0)
    // //         .attr("y", (d,i)=>i*50+200)
    // //         .text((d,i)=>"Cluster "+(i+1))
    // //         .style("cursor", "pointer")
    // //         .on("mouseover",d=> identifyClusters(d))
    // //         .on("mouseout", clearAll)

    // //     function identifyClusters(d){
    // //         d.forEach(i =>{
    // //             d3.selectAll("#circle_"+i)
    // //               .style("fill", "brown")
    // //               .attr("r", 10)
    // //               .attr("opacity", 0.5)
    // //         })
    // //     }
    // //     function clearAll(){
    // //         d3.selectAll("circle")
    // //             .style("fill", "steelblue")
    // //             .attr("r", 3)
    // //             .attr("opacity", 1)
    // //     }
    // // })

function demand_covered(){
    var dist_set = []
    for (let customer of data.customers){
        var temp = data.dist_c2c.filter(d=>d.dist <= 500 && d.customer_from == customer.customer_id).map(d=>d.customer_to)
        dist_set.push(temp)
    }
    //Find clusters that share the same coverage
    var clusters = []
    same_list = new Set()
    for (let i=0;i<49;i++){
        for (let j=i+1;j<50;j++){
            if ((_.isEqual(_.intersection(dist_set[i],dist_set[j]),dist_set[i])) || (_.isEqual(_.intersection(dist_set[i],dist_set[j]), dist_set[j]))){
                if (_.isEqual(dist_set[i], dist_set[j])){
                    if (same_list.has(i+1)){
                        var ind = clusters.findIndex(d=>d.has(i+1))
                        clusters[ind].add(j+1)
                    } else if (same_list.has(j+1)){
                        var ind = clusters.findIndex(d=>d.has(j+1))
                        clusters[ind].add(i+1)

                    //Never seen
                    } else {
                        clusters.push(new Set([i+1, j+1]))
                    }
                    same_list.add(i+1)
                    same_list.add(j+1)
                }
            }
        }
    }
    return clusters
}


function total_demand(product_id){
    return d3.format('.2f')(_.sum(data.demand.filter(d => d.product_id == product_id).map(d => d.demand)))
}

var baseline_500_coverage = [1,2,3,4,5].map(product_id=>{
    var plant_id = product_id == 5 ? 4: product_id
    var covered_customers = data.dist_p2c.filter(d=>d.dist <= 500 && d.plant_id == Math.min(product_id, 4)).map(d=>d.customer_id)
    var covered_demand = _.sum(data.demand.filter(d=>d.product_id == product_id && covered_customers.includes(d.customer_id)).map(d=>d.demand))
    var total_demand = _.sum(data.demand.filter(d => d.product_id == product_id).map(d => d.demand))
    return covered_demand/total_demand
})

function calculate_demand(warehouses){
    //Set already covered customers' demands to 0        
    var demand_list = []
    for(let product=1;product<=5;product++){
        var plant_id = product == 5 ? 4 : product
        var covered_customers = data.dist_p2c.filter(d=>d.dist<=500 && d.plant_id == plant_id).map(d=>d.customer_id)
        demand_list.push(data.demand.filter(d=>d.product_id == product).map(d=>{
            return covered_customers.includes(d.customer_id) ? 0 : d.demand
        }))
    }

    //Map backto customer_id for transport cost calculation
    var warehouse_ind = _.map(warehouses, (d,i) => d>0 ? i+1 : 0).filter(d=>d>0)
    var warehouse_transport_cost = {}
    var plant_to_warehouse_cost = [0, 0, 0, 0]
    var plant_transport_cost = [0, 0, 0, 0]
    var demand_covered = [0, 0, 0, 0, 0]
    warehouse_ind.map(d => warehouse_transport_cost[d]= [0, 0, 0, 0, 0])
    //For each customer and demand, pick the closest option and be fulfilled by that.
    for (let demand of data.demand){
        var plant_id = demand.product_id == 5 ? 4 : demand.product_id
        var plant = _.find(data.dist_p2c, d=>d.customer_id==demand.customer_id && d.plant_id == plant_id)
        var closest_warehouse = _.sortBy(data.dist_c2c.filter(d=>d.customer_to==demand.customer_id && warehouse_ind.includes(d.customer_from)),d=>d.dist)[0]
        closest_warehouse.customer_id = closest_warehouse.customer_from
        //Fulfilled directly by plant
        if (plant.dist < closest_warehouse.dist && plant.dist <= 500){
            // console.log(`Product ${demand.product_id} for Customer ${demand.customer_id} is fulfilled by the plant`)
            plant_transport_cost[plant.plant_id-1] += Math.ceil(demand.demand / 10) * 2 * plant.dist
            demand_covered[demand.product_id-1] += demand.demand
        //fulfilled by plant
        } else if (plant.dist > closest_warehouse.dist && closest_warehouse.dist <= 500){
            // console.log(`Product ${demand.product_id} for Customer ${demand.customer_id} is fulfilled by the warehouse`)    
            warehouse_transport_cost[closest_warehouse.customer_id][demand.product_id-1] += Math.ceil(demand.demand / 10) * 2 * closest_warehouse.dist
            let plant_to_warehouse_dist = _.find(data.dist_p2c, d=>d.customer_id==closest_warehouse.customer_id && d.plant_id ==plant_id).dist
            plant_to_warehouse_cost[plant_id-1] += Math.ceil(demand.demand/10) * 2 * plant_to_warehouse_dist
            demand_covered[demand.product_id-1] += demand.demand
        } else {
            //Not covered at all, so fulfill straight from the plant, but don't add it to demand_covered
            plant_transport_cost[plant.plant_id-1] += Math.ceil(demand.demand / 10) * 2 * plant.dist
        }
    }
    //Straight from plant to customer + warehouse to customer + plant to warehouse
    var total_warehouse_to_customer = _.sum(Object.values(warehouse_transport_cost).map(d=>_.sum(d)))
    var total_plant_to_customer = _.sum(plant_transport_cost)
    var total_plant_to_warehouse = _.sum(plant_to_warehouse_cost)
    var total_transport_cost = total_warehouse_to_customer + total_plant_to_customer + total_plant_to_warehouse

    //Create 50x50 distance_matrix
    var dist_matrix = []
    for (let customer of data.customers){
        //[0,1] vector to see if this customer covers others within 500 miles
        var dist_c2c = data.dist_c2c.filter(d=>d.customer_from==customer.customer_id)
        var temp = dist_c2c.sort((a,b)=>a.customer_to > b.customer_to).map(d => d.dist <= 500 ? 1 : 0)
        dist_matrix.push(temp)
    }

    var demand_covered_percent = demand_covered.map((d,i)=>(d/total_demand(i+1)))
    return [demand_covered, demand_covered_percent, total_transport_cost]
}

function getCombinations(array_in, size) {
    function p(t, i) {
        if (t.length === size) {
            result.push(t);
            return;
        }
        if (i + 1 > array_in.length) {
            return;
        }
        p(t.concat(array_in[i]), i + 1);
        p(t, i + 1);
    }

    var result = [];
    p([], 0);
    return result;
}

function iterate_combinations(){
    //We should only consider
    //[8, 35, 27, {4|25|26|33|39}, 12, 27, 14, 30, {5|6|16|17|34|41|49},
    //{7|24|50}, 31, {13|47}, {2|28|36|43}]
    //Because others are strictly dominated
    // Of the identical sets, calculating mean distance shows which would be ideal
    //So only consider the following
    var possible_customers = [8,35,12,27,14,30,5,31,13,2, 24, 7, 50, 39]
    //Final answer
    possible_customers = [5, 8, 31, 39]

    for (i=4;i<5;i++){
        var permut = getCombinations(possible_customers, i)
        var current_transport_cost = 1e12
        for (let warehouse of permut){
            var warehouses = Array(50).fill(0)
            warehouse.forEach(i=>{
                warehouses[i-1]=1
            })

            //Target percentage is used, because of baseline coverage from the plants
            var result = calculate_demand(warehouses)
            var output = result[0]
            var output_percent = result[1]
            var transport_cost = result[2]
            if (output_percent.filter((d,i)=>d>=.8).length == 5 && transport_cost <= current_transport_cost){
                console.log(warehouse, output_percent, transport_cost)
                current_transport_cost = transport_cost
                after_warehouse_percentage = output_percent
            }
        }
        data.warehouse_transport_cost = current_transport_cost
    }
    return after_warehouse_percentage
}

function calculate_baseline_transport_cost(){
    var all_customer_demand = []
    var ans = 0
    for (let customer=1;customer<=50;customer++){
        var customer_demand = data.demand.filter(d=>d.customer_id ==customer && d.product_id < 5).map(d=>d.demand)
        customer_demand[3] += _.find(data.demand, d=>d.customer_id==customer && d.product_id ==5).demand
        customer_demand.forEach((d,plant_id)=>{
            var distance =  _.find(data.dist_p2c, v=>v.plant_id == (plant_id+1) && v.customer_id == customer).dist
            ans += distance * Math.ceil(d/10) * 2
        })
        all_customer_demand.push(customer_demand)
        data.no_warehouse_transport_cost = ans

    }
    console.log(`Baseline transport cost is ${formatNum(ans)}, Delta: ${formatNum(108243401.94-ans)}`)
}
calculate_baseline_transport_cost()

//Assuming infinite capacity, what is the theoretical max profit?
//Profit is driven by Revenue, production cost, transport cost, setup cost,
//Revenue is fixed, and production cost is largely fixed, we we need to reduce transport cost and setup cost
//Let's assumme no capacity limit and production rate
function calculate_theoretical_max_profit(){
    //Theoretical minimum transport cost. I.e., if all products were fulfilled by the closest plant.
    //This approach also combines shipments as best as it can.
    var total_transport_cost = 0
    data.production_cost = _.sum(data.demand.map(d=>(6-d.product_id)*100*d.demand))
    data.revenue = _.sum(data.demand.map(d=>d.revenue*d.demand))
    var demand_per_plant = [0,0,0,0]
    for (let customer=1;customer<=50;customer++){
        var closest_plant = _.sortBy(data.dist_p2c.filter(d=>d.customer_id==customer), d=>d.dist)[0]
        var all_demand = _.sum(data.demand.filter(d=>d.customer_id==customer).map(d=>d.demand))
        demand_per_plant[closest_plant.plant_id -1] += all_demand
        total_transport_cost += Math.ceil(all_demand/10) * 2 * closest_plant.dist
    }
    var total_profit = data.revenue - data.production_cost - total_transport_cost - 40e6
    console.log(`Total Revenue is fixed at ${formatNum(data.revenue)}`)
    console.log(`Total Production cost with no overtime is fixed at ${formatNum(data.production_cost)}`)
    console.log(`Theoretical minimum transport cost is ${formatNum(total_transport_cost)}`)
    console.log(`Theoretical Profit: ${formatNum(data.revenue-data.production_cost-total_transport_cost)} (no upgrade, setup, overtime)`)
    console.log(`With plants producing`)
    console.log(`Plant 1: ${formatNum(demand_per_plant[0])} with ${Math.ceil(demand_per_plant[0]/800)} regular working days / year`)
    console.log(`Plant 2: ${formatNum(demand_per_plant[1])} with ${Math.ceil(demand_per_plant[1]/400)} regular working days / year`)
    console.log(`Plant 3: ${formatNum(demand_per_plant[2])} with ${Math.ceil(demand_per_plant[2]/400)} regular working days / year`)
    console.log(`Plant 4: ${formatNum(demand_per_plant[3])} with ${Math.ceil(demand_per_plant[3]/400)} regular working days / year`)
    console.log(`With all plants upgraded, max profit with theoretical minimum transport cost and no setup cost is ${formatNum(total_profit)}`)
}
calculate_theoretical_max_profit()

function calculate_demand_cost(customer_id){
    customers_to_be_served = _.find(customers, d=>d.id == customer_id).customers_within_500
    var weighted_cost = 0
    for (let customer of customers_to_be_served){
        demand_served = _.sum(data.demand.filter(d=>d.customer_id==customer).map(d=>d.demand))
        distance = data.dist_c2c.filter(d=> (d.customer_to==customer) && (d.customer_from ==customer_id)).map(d=>d.dist)[0]
        weighted_cost += Math.ceil(demand_served/10)* distance * 2 
    }
    return weighted_cost
}

function decide_city_within_cluster(clusters){
    clusters.forEach((cluster, i)=>{
        var min_customer = -1
        var cost = 1e10
        for (let customer of cluster){
            if (cost > calculate_demand_cost(customer)){
                min_customer = customer
                cost = calculate_demand_cost(customer)
            }
        }
    // console.log(cluster, min_customer)
    })
}
// decide_city_within_cluster(clusters)

//Given the start product and possible products to cycle through, give the shortest cycle days to transition through and return to normal
function best_cycling_products(start_product, possible_products){
    function permute(input_array) {
      var i, ch;
      for (i = 0; i < input_array.length; i++) {
        ch = input_array.splice(i, 1)[0];
        usedChars.push(ch);
        if (input_array.length === 0) {
          permArr.push(usedChars.slice());
        }
        permute(input_array);
        input_array.splice(i, 0, ch);
        usedChars.pop();
      }
      return permArr
    };

    function setup_cost(from, to){
        return _.find(data.setup, d=>d.from==from && d.to==to).days
    }
        var permArr = []
        var usedChars = []

        var permut_input = possible_products
        permut_input.splice(possible_products.indexOf(start_product),1)
        var permutations = permute(permut_input)
        var cost = 1000
        var best_candidate = []
        for (let cycle of permutations){
            // Iterate through all possible permutations of cycle to get the best cycling
            var temp_cost = setup_cost(start_product,cycle[0])
            for (let i=0; i<cycle.length-1;i++){
                temp_cost += setup_cost(cycle[i],cycle[i+1])
            }

            temp_cost += setup_cost(cycle[cycle.length-1],start_product)
            if (cost > temp_cost){
                cost = temp_cost
                best_candidate = cycle
            }
        }
    console.log(start_product, best_candidate, cost)
}
// best_cycling_products(3,[1,2,3])

//Fill out the slides
function hydrate_slides(){
    d3.select("#no_warehouse_transport_cost").html("$"+formatNum(data.no_warehouse_transport_cost))
    d3.select("#warehouse_transport_cost").html("$"+formatNum(data.warehouse_transport_cost))
    d3.select("#cost_difference").html("$"+formatNum(data.warehouse_transport_cost-data.no_warehouse_transport_cost))
    d3.select("#baseline_1_coverage").html(d3.format(".2%")(baseline_500_coverage[0]))
    d3.select("#baseline_2_coverage").html(d3.format(".2%")(baseline_500_coverage[1]))
    d3.select("#baseline_3_coverage").html(d3.format(".2%")(baseline_500_coverage[2]))
    d3.select("#baseline_4_coverage").html(d3.format(".2%")(baseline_500_coverage[3]))
    d3.select("#baseline_5_coverage").html(d3.format(".2%")(baseline_500_coverage[4]))
    d3.select("#product_1_coverage").html(d3.format(".2%")(after_warehouse_percentage[0]))
    d3.select("#product_2_coverage").html(d3.format(".2%")(after_warehouse_percentage[1]))
    d3.select("#product_3_coverage").html(d3.format(".2%")(after_warehouse_percentage[2]))
    d3.select("#product_4_coverage").html(d3.format(".2%")(after_warehouse_percentage[3]))
    d3.select("#product_5_coverage").html(d3.format(".2%")(after_warehouse_percentage[4]))
    d3.select("#coverage_diff_1").html(d3.format(".2%")(after_warehouse_percentage[0]-baseline_500_coverage[0]))
    d3.select("#coverage_diff_2").html(d3.format(".2%")(after_warehouse_percentage[1]-baseline_500_coverage[1]))
    d3.select("#coverage_diff_3").html(d3.format(".2%")(after_warehouse_percentage[2]-baseline_500_coverage[2]))
    d3.select("#coverage_diff_4").html(d3.format(".2%")(after_warehouse_percentage[3]-baseline_500_coverage[3]))
    d3.select("#coverage_diff_5").html(d3.format(".2%")(after_warehouse_percentage[4]-baseline_500_coverage[4]))

    d3.selectAll("#baseline_revenue").html("$"+formatNum(data.baseline.revenue))
    d3.select("#baseline_production_cost").html("$"+formatNum(data.baseline.production_cost))
    d3.select("#baseline_transport_cost").html("$"+formatNum(data.baseline.transport_cost))
    d3.select("#baseline_setup_cost").html(d3.format("^$.2s")(data.baseline.setup_cost))
    d3.select("#baseline_upgrade_cost").html("$"+formatNum(data.baseline.upgrade_cost))
    d3.select("#baseline_profit").html("$"+formatNum(data.baseline.profit))

    d3.select("#upgrade_revenue").html("$"+formatNum(data.upgrade_123.revenue))
    d3.select("#upgrade_production_cost").html("$"+formatNum(data.upgrade_123.production_cost))
    d3.select("#upgrade_transport_cost").html("$"+formatNum(data.upgrade_123.transport_cost))
    d3.select("#upgrade_setup_cost").html(d3.format("^$.2s")(data.upgrade_123.setup_cost))
    d3.select("#upgrade_upgrade_cost").html(d3.format("^$.2s")(data.upgrade_123.upgrade_cost))
    d3.select("#upgrade_profit").html("$"+formatNum(data.upgrade_123.profit))

    d3.select("#production_cost_diff").html(d3.format("+^$.5s")(data.upgrade_123.production_cost-data.baseline.production_cost))
    d3.select("#transport_cost_diff").html(d3.format("+^$.5s")(data.upgrade_123.transport_cost-data.baseline.transport_cost))
    d3.select("#setup_cost_diff").html(d3.format("^$.2s")(data.upgrade_123.setup_cost-data.baseline.setup_cost))
    d3.select("#upgrade_cost_diff").html(d3.format("^$.2s")(data.upgrade_123.upgrade_cost-data.baseline.upgrade_cost))
    d3.select("#profit_diff").html(d3.format("+^$.5s")(data.upgrade_123.profit-data.baseline.profit))

    d3.select("#raw_product_cost").html("$"+formatNum(_.sum(data.demand.map(d=>(6-d.product_id)*100*d.demand))))
}
hydrate_slides()

function preprocessing(){     
    dist_p2c.forEach(d=>{
        d.customer_id = +d.customer_id
        d.plant_id = +d.plant_id
        d.dist = +d.dist
    })

    dist_c2c.forEach(d=>{
        d.dist = +d.dist
        d.customer_from = +d.customer_from
        d.customer_to = +d.customer_to
    })

    customers_input.forEach(d=>{
        d.customer_id = +d.customer_id
        d.lat = +d.lat
        d.long = +d.long
    })

    plants = []
    plants_input.forEach(d=>{
        d.plant_id = +d.plant_id
        d.lat = +d.lat
        d.long = +d.long
    })

    demand_input.forEach(d=>{
        d.customer_id = +d.customer_id
        d.product_id = +d.product_id
        d.demand = +d.demand
        d.revenue = +d.revenue
    })

    capacity_input.forEach(d=>{
        d.plant_id = +d.plant_id
        d.product_id = +d.product_id
        d.capacity = +d.capacity
        d.cost = +d.cost
    })

    setup_input.forEach(d=> {
        d.from = +d.from
        d.to = +d.to
        d.days = +d.days
    })
}
