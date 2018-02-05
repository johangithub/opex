class Scenario {
    constructor(name, upgraded, available_plants){
        this.name = name
        this.upgraded = upgraded
        this.upgrade_cost = upgraded.length * 10000000
        this.available_plants = available_plants
        this.quarter = 1
        this.customers = []
        this.plants = []
        this.demands = []
        this.profit = 0
        this.transport_cost = 0
        this.revenue = 0
        this.production_cost = 0
        this.setup_cost = 0
    }
    plan(){
        var total_demand_1 = _.sum(this.demands.filter(d=>d.product_id==1).map(d=>d.quarterly_demand_reamining))
        var total_demand_2 = _.sum(this.demands.filter(d=>d.product_id==2).map(d=>d.quarterly_demand_reamining))
        var total_demand_3 = _.sum(this.demands.filter(d=>d.product_id==3).map(d=>d.quarterly_demand_reamining))
        var total_demand_4 = _.sum(this.demands.filter(d=>d.product_id==4).map(d=>d.quarterly_demand_reamining))
        var total_demand_5 = _.sum(this.demands.filter(d=>d.product_id==5).map(d=>d.quarterly_demand_reamining))

        //assign production plan and target production amount to each plant
        function assign_demand_to_plants(){
            var sorted_demands = _.sortBy(this.demands, d=>get_marginal_profit(d, this.available_plants))
            function get_marginal_profit(demand, available_plants){
                //All available plants in this scenario sorted by the distance
                var production_cost_per_ton = (6-demand.product_id)*100
                var available_plants = available_plants[demand.product_id]
                var profit = available_plants.map(d=> (demand.revenue*demand.demand - d.dist*2*Math.ceil(demand.quarterly_demand_reamining/10)+ production_cost_per_ton * demand.quarterly_demand_reamining))
                if (profit.length > 1){
                    return profit[1] - profit[0]
                } else {
                    return 1e9
                }
            }
            return sorted_demands
        }
    }
    //We should only deliver once each quarter, since it theoretically takes one day
    deliver(){

        //Delivery
        //The idea is that we assign each plant to fulfill demand at the end of quarter
        for (let demand of this.demands){
            //Only deliver all of if done producing for that customer to prevent small shipment. subtract demand if delivered.
            //If this demand > current inventory available, fulfill as much as the inventory but only 10 tons increment
            // if (customer.demands_remaining[this.current_product-1] > this.inventory[this.current_product-1]){
                // var fulfilled_tons = Math.floor(this.inventory[this.current_product-1] / 10) * 10
            //If we have enough, fulfill the demand
            // } else {
            //     var fulfilled_tons = customer.demands_remaining[this.current_product-1]
            // }

            //Remove fulfilled demand from inventory
            this.inventory[this.current_product-1] -= fulfilled_tons

            //Remove from demands remaining
            demands_remaining[this.current_product-1] -= fulfilled_tons

            //Remove form target fulfillment for that plant
            this.target_fulfillment[this.current_product-1] -= fulfilled_tons

            // Add revenue
            var revenue_per_ton = customer.id >= 40 ? 1200 : 1000
            this.revenue += revenue_per_ton * fulfilled_tons

            // calculate trasport cost 
            this.transport_cost += Math.ceil(fulfilled_tons / 10) * 2 * customer.get_distance_to_plants(this.id)

            //Output delivery result
            if (fulfilled_tons > 0){
                console.log(`From Plant ${this.id} fulfilled Customer ${customer.id} Product ${this.current_product} ${fulfilled_tons} tons` )
            }
            //See if there is any remaining, then reset quarterly demand
        }
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
    constructor(id, city, state, lat, long){
        this.id = id
        this.city = city
        this.state = state
        this.lat = lat
        this.long = long
        this.dist_p2c = data.dist_p2c.filter(d=>d.customer_id==this.id)
        this.dist_c2c = data.dist_c2c.filter(d=>d.customer_from==this.id)
    }
    get customers_within_500(){
        return this.dist_c2c.filter(d=>d.dist <= 500).map(d=>d.customer_to)
    }
    closest_plant(){
        return _.minBy(this.dist_p2c, d=>d.dist)
    }
    get_distance_to_plants(plant_id){
        //If plant id not provided, return all plants
        if (plant_id==undefined){
            return this.dist_p2c
        } else {
            return _.find(this.dist_p2c, d => d.plant_id == plant_id).dist
        }
    }
    get_distance_to_customers(customer_id){
        if (customer_id==undefined){
            return this.dist_c2c
        } else {
            return _.find(this.dist_c2c, d => d.customer_to == customer_id).dist
        }
    }
}

class Plant {
    constructor(id, city, state, lat, long){
        this.id = id
        this.city = city
        this.state = state
        this.lat = lat
        this.long = long
        this.dist_p2c = data.dist_p2c.filter(d=>d.plant_id==this.id)
        this.current_product = this.id
        this.production_rate = this.id == 1 ? 100 : 50
        this.inventory = [0,0,0,0,0]
        this.target_fulfillment = [0,0,0,0,0]
        this.customer_serving = []
        this.reset_quarterly()
    }
    get customers_within_500(){
        return this.dist_p2c.filter(d=>d.dist <= 500).map(d=>d.customer_id)
    }
    get production_remaining_quarterly(){
        return this.production_rate * 8 * this.days_remaining_quarterly
    }
    get capacity_remaining_quarterly(){
        return this.capacity
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
        this.quarterly_production = 0
        this.customer_serving = []
        this.target_fulfillment = [0,0,0,0,0]
        this.capacity = {}
        data.capacity.filter(d=>d.plant_id == this.id).map(d=>{
            this.capacity[d.product_id] = d.capacity / 4
        })
    }
    get_distance_to_customers(customer_id){
        //If customer id not provided, return all customers
        if (customer_id==undefined){
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

        // If setting up, skip producing
        if (this.setup_days>0){
            console.log(`Plant ${this.id} setting up to ${this.current_product}...`)
            this.setup_days -= 1
        } else if(this.capacity[this.current_product] <= 0){
            console.log(`Plant ${this.id} reached max capacity for Product ${this.current_product}`)
        } else {

            //Tons produced
            var tons_made = Math.min(8*this.production_rate, this.target_fulfillment[this.current_product-1], this.capacity[this.current_product])
            this.quarterly_production += tons_made

            //Add produced items to inventory
            this.inventory[this.current_product-1] += tons_made

            //Add production cost
            this.production_cost += this.production_cost_per_ton * tons_made

            //Reduce capacity
            this.capacity[this.current_product] -= tons_made

            if (this.overtime){
                var overtime_production = Math.min(4*this.production_rate, this.target_fulfillment[this.current_product-1], this.capacity[this.current_product])
                this.quarterly_production += overtime_production
                this.inventory[this.current_product-1] += overtime_production
                this.production_cost += this.production_cost_per_ton * 1.5 * overtime_production
                this.capacity[this.current_product] -= overtime_production

            }
        }
    }
}

//Load data
var q = d3.queue()
          .defer(d3.csv, 'demand.csv')
          .defer(d3.csv, 'plants.csv')
          .defer(d3.csv, 'products.csv')
          .defer(d3.csv, 'setup.csv')
          .defer(d3.csv, 'customers.csv')
          .defer(d3.csv, 'capacity.csv')
          .defer(d3.csv, 'dist_c2c.csv') 
          .defer(d3.csv, 'dist_p2c.csv')
          .await(ready)

data = {}

function ready(error, demand_input, plants_input, products_input, setup_input, customers_input, capacity_input, dist_c2c, dist_p2c){
    if (error) throw error
    
    data['demand'] = demand_input
    data['plants'] = plants_input
    data['products'] = products_input
    data['setup'] = setup_input
    data['customers'] = customers_input
    data['capacity'] = capacity_input
    data['dist_c2c'] = dist_c2c
    data['dist_p2c'] = dist_p2c

    preprocessing()

    data['clusters'] = demand_covered()
    data['after_warehouse_percent'] = iterate_combinations()


function formatNum(number){
    return d3.format(".5s")(number)
}   

scenarios = []
// scenarios.push(new Scenario('all_upgrade', [1,2,3,4]))

//Initialize list of Demand, Customer, Plant classes
var demands = data.demand.map(d=>new Demand(d.product_id, d.customer_id, d.demand))
var customers = data.customers.map(d=>new Customer(d.customer_id, d.city, d.state, d.lat, d.long))
var plants = data.plants.map(d=>new Plant(d.plant_id, d.city, d.state, d.lat, d.long))

// baseline scenario
var baseline = new Scenario('baseline', [], {1: [1], 2: [2], 3: [3], 4: [4], 5: [4],})
baseline.customers = _.cloneDeep(customers)
baseline.demands = _.cloneDeep(demands)
baseline.plants = _.cloneDeep(plants)
scenarios.push(baseline)


// Upgrading 123 scenario. 
var upgrade_123 = new Scenario('upgrade_123', [1,2,3], {1: [1,2,3], 2: [1,2,3], 3: [1,2,3], 4: [4], 5: [4],}) 
upgrade_123.customers = _.cloneDeep(customers)
upgrade_123.demands = _.cloneDeep(demands)
upgrade_123.plants = _.cloneDeep(plants)
scenarios.push(upgrade_123)

    function simulate_fulfillment(scenario){
        //4 quarters. 5 Products. 4 Plants.
        for (let quarter=1;quarter<=1;quarter++){
            //reset customer demand and plant conditions
            for (let customer of customers){
                // customer.reset_quarterly_demands()
            }
            for (let plant of plants){
                plant.reset_quarterly()                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     
            }
            // Need to determine optimal allocation of product 1,2,3 inventory among plant 1,2,3 for all 50 customers
            if (scenario.name == 'baseline'){
                for (let plant_id of [1,2,3,4]){
                    plants[plant_id-1].customer_serving = _.range(1,51)
                }
                // plants[0].target_fulfillment[0] = _.sum(customers.map(d=>d.demands_remaining[0]))
                // plants[1].target_fulfillment[1] = _.sum(customers.map(d=>d.demands_remaining[1]))
                // plants[2].target_fulfillment[2] = _.sum(customers.map(d=>d.demands_remaining[2]))
                // plants[3].target_fulfillment[3] = _.sum(customers.map(d=>d.demands_remaining[3]))
                // plants[3].target_fulfillment[4] = _.sum(customers.map(d=>d.demands_remaining[4]))

            } else if (scenario.name =='upgrade_123'){
                // customers.forEach(customer=>{
                //     //Nearest plant out of 1, 2, 3
                //     var nearest_plant = _.sortBy(customer.get_distance_to_plants().filter(d=>[1,2,3].includes(d.plant_id)),d=>d.dist).map(d=>d.plant_id)[0]
                //     plants[nearest_plant-1].customer_serving.push(customer.id)
                //     plants[nearest_plant-1].target_fulfillment[0] += customer.demands_remaining[0]
                //     plants[nearest_plant-1].target_fulfillment[1] += customer.demands_remaining[1]
                //     plants[nearest_plant-1].target_fulfillment[2] += customer.demands_remaining[2]

                //     //plant 4 fulfills everyone
                //     plants[3].customer_serving = _.range(1,51)  
                //     plants[3].target_fulfillment[3] += customer.demands_remaining[3]
                //     plants[3].target_fulfillment[4] += customer.demands_remaining[4]
                // })
            }

            //Simulate each day
            for (let day=1;day<=90;day++){
                // console.log(`day ${day+90*(quarter-1)}`)
                //baseline scenario. There's no switching, except when plant 4 is done making and meeting product 4 demands. Overtime is required for plant 1 for 5 days each
                if (scenario.name =='baseline'){
                    // Plant 1 needs to run overtime for five days, assuming only four hours of overtime per day is available.
                    // if (day>=86 && plants[0].overtime == false){
                    //     plants[0].work_overtime()
                    // }
                    // //If plant 3 fulfilled product 4 demand, switch to 5
                    // if (_.sum(scenario.demands_remaining(4)) == 0 && _.sum(scenario.demands_remaining(5)) > 0 && plants[3].current_product == 4 && [1,3].includes(quarter)){
                    //     plants[3].switch_product(5)
                    // }
                    // //Once plant 3 finishes fulfilling product 5 demand, switch back to product 4
                    // if (_.sum(scenario.demands_remaining(5)) == 0 && _.sum(scenario.demands_remaining(4)) > 0 && plants[3].current_product == 5 && [2,4].includes(quarter)){
                    //     plants[3].switch_product(4)
                    // }
                    // plants[0].produce()
                    // plants[1].produce()
                    // plants[2].produce()
                    // plants[3].produce()
                    // plants[2].deliver()
                    // plants[1].deliver()
                    // plants[3].deliver()
                    // plants[0].deliver()

                // Keep plant 4 and product 4/5 fulfilment strategy the same as baseline.
                // Switching from 3 to 2/4 or 2 to 3/4 is costly, so it would be 2 to 1 and back to 2. Same for 3
                } else if (scenario.name == 'upgrade_123'){
                    // if (day==1 && plants[2].overtime == false){
                    //     plants[2].work_overtime()
                    // }
                    // //If plant 3 fulfilled product 4 demand, switch to 5
                    // if (_.sum(scenario.demands_remaining(4)) == 0 && _.sum(scenario.demands_remaining(5)) > 0 && plants[3].current_product == 4 && [1,3].includes(quarter)){
                    //     plants[3].switch_product(5)
                    // }
                    // //Once plant 3 finishes fulfilling product 5 demand, switch back to product 4
                    // if (_.sum(scenario.demands_remaining(5)) == 0 && _.sum(scenario.demands_remaining(4)) > 0 && plants[3].current_product == 5 && [2,4].includes(quarter)){
                    //     plants[3].switch_product(4)
                    // }

                    //Cycle through
                    // for (let plant of [0,1,2]){
                    //     if ((plants[plant].capacity[1]<=0 ||plants[plant].target_fulfillment[0] == 0) && plants[plant].target_fulfillment[1] > 0 && plants[plant].current_product == 1){
                    //         plants[plant].switch_product(2)
                    //     }
                    //     if ((plants[plant].capacity[2]<=0 ||plants[plant].target_fulfillment[1] == 0) && plants[plant].target_fulfillment[2] > 0 && plants[plant].current_product == 2){
                    //         plants[plant].switch_product(3)
                    //     }
                    //     if ((plants[plant].capacity[3]<=0 ||plants[plant].target_fulfillment[2] == 0) && plants[plant].target_fulfillment[0] > 0 && plants[plant].current_product == 3){
                    //         plants[plant].switch_product(1)
                    //     }
                    // }

                    // plants[0].produce()
                    // plants[1].produce()
                    // plants[2].produce()
                    // plants[3].produce()
                    // plants[2].deliver()
                    // plants[1].deliver()
                    // plants[3].deliver()
                    // plants[0].deliver()
                }
            }

            //check if there is any demand unmet in this quarter. If that's the case, the scenario failed.
            console.log(`Remaining demands at the end of Q${quarter}
                    Product 1: ${d3.format(".2f")()}
                    Product 2: ${d3.format(".2f")()}
                    Product 3: ${d3.format(".2f")()}
                    Product 4: ${d3.format(".2f")()}
                    Product 5: ${d3.format(".2f")()}
                    Utilization Rate /  Production Cost / Transportation Cost 
                    Plant 1: ${plants[0].utilization_rate} / ${formatNum(plants[0].production_cost)} / ${formatNum(plants[0].transport_cost)}
                    Plant 2: ${plants[1].utilization_rate} / ${formatNum(plants[1].production_cost)} / ${formatNum(plants[1].transport_cost)}
                    Plant 3: ${plants[2].utilization_rate} / ${formatNum(plants[2].production_cost)} / ${formatNum(plants[2].transport_cost)}
                    Plant 4: ${plants[3].utilization_rate} / ${formatNum(plants[3].production_cost)} / ${formatNum(plants[3].transport_cost)}
                    `)

            scenario.total_q_profit = 0
            scenario.total_q_transport_cost = 0
            scenario.total_q_revenue = 0
            scenario.total_q_production_cost = 0
            scenario.total_q_setup_cost = 0
            for (let plant of plants){
                scenario.total_q_transport_cost += plant.transport_cost
                scenario.total_q_production_cost += plant.production_cost
                scenario.total_q_revenue += plant.revenue
                scenario.total_q_profit += plant.revenue - plant.transport_cost - plant.production_cost
                scenario.total_q_setup_cost += plant.setup_cost
            }
            //Add to total number
            scenario.profit += scenario.total_q_profit
            scenario.transport_cost += scenario.total_q_transport_cost
            scenario.revenue += scenario.total_q_revenue
            scenario.production_cost += scenario.total_q_production_cost
            scenario.setup_cost += scenario.total_q_setup_cost


        }
    }

    for (let scenario of scenarios){
        simulate_fulfillment(scenario)

        console.log(`Scenario ${scenario.name}
            Profit: ${formatNum(scenario.profit)} 
            Revenue: ${formatNum(scenario.revenue)} 
            Production Cost: ${formatNum(scenario.production_cost)} 
            Transportation Cost: ${formatNum(scenario.transport_cost)} 
            Setup Cost: ${formatNum(scenario.setup_cost)} 
            Upgrade Cost: ${formatNum(scenario.upgrade_cost)}
            `)
    }


    var svgWidth = 1400
    var svgHeight = 500

    // Add product selection
    var select = d3.select("body").append("select")
                   .attr("id", "product")
                   .style("top", "10px")
                   .on("change", onProductChange)

    select.selectAll("option")
        .data(['All','1','2','3','4','5']).enter()
        .append("option")
        .text(d => d)

    // Add Sort bars
    var radio = d3.select("body")
                  .append("div")
                  .attr("id", "radios")
    radio.selectAll("label")
        .data(["customer_id", "demand"])
        .enter()
        .append("label")
        .text(d => d)
        .insert("input")
        .attr("type", "radio")
        .attr("name", "sort")
        .attr("value", d => d)

    document.getElementsByName("sort")[0].checked = true
    radio.on("change", ()=>{
        var checkedValue = _.find([...document.getElementsByName("sort")], d => d.checked).value
        if (checkedValue =='customer_id'){
            x.domain(_.range(1,51))
        } else if (checkedValue == 'demand'){
            var product_id =  d3.select("#product").property("value")
            if (product_id == 'All'){
                var demand_data = _.flatMap(_.groupBy(data.demand, d=>d.customer_id), d=>{
                return {customer_id: d[0].customer_id, demand: _.sum(d.map(v=>v.demand))}})
                x.domain(demand_data.sort((a,b) => a.demand < b.demand).map(d => d.customer_id))
            } else {
                x.domain(data.demand.sort((a,b) => a.demand < b.demand).filter(d => d.product_id==product_id).map(d => d.customer_id))
            }
        }
        updateBar()   
    })

    var text = d3.select("body")
                 .append("div")
                 .selectAll(".summary")
                 .data([1,2,3,4,5])

    text.enter()
        .append("text")
        .attr("class", "summary")
        .attr("dy", function(d){return d})
        .attr("x", 0)
        .html(function(product_id){
            return 'Product '+ product_id+ 
                ' / Total Q Demand: '+total_demand(product_id) / 4 +
                 ' / 500-mile Coverage: '+d3.format(".2%")(coverage_500(product_id)) + ' / With warehouses: '+d3.format(".2%")(data.after_warehouse_percent[product_id-1]+coverage_500(product_id)) +'<br>'
                })

    var svg = d3.select("body").append("svg"),
          margin = {top: 20, right: 20, bottom: 30, left: 70},
          width = svgWidth - margin.left - margin.right,
          height = svgHeight - margin.top - margin.bottom
    svg.attr("width", svgWidth)
       .attr("height", svgHeight)

    var tip = d3.tip().attr("class", "d3-tip").html(d=>
        {
            var customer = _.find(data.customers, customer => customer.customer_id == d.customer_id)
            return `Customer ${customer.customer_id} <br>
                ${customer.city}, ${customer.state} <br>
                ${d.demand} tons`
        })

    svg.call(tip)

    x = d3.scaleBand().rangeRound([0, width]).padding(0.1)
    y = d3.scaleLinear().rangeRound([height, 0])

    x.domain(_.range(1,51))
    x.rangeRound([0, 25*50]).padding(0.1)

    
    var g = svg.append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    var xAxis = d3.axisBottom(x)
    var yAxis = d3.axisLeft(y).ticks(10)

    g.append("g")
    .attr("class", "axis axis--x")
    .attr("transform", "translate(0," + height + ")")

    g.append("g")
    .attr("class", "axis axis--y")
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", "0.71em")
    .attr("text-anchor", "end")
    .text("Frequency")

    var color = function(d){
        //If already covered, color grey
        if (d.product_id == 1 && ([10,19,20,27,31].includes(d.customer_id)) ||
            d.product_id == 2 && ([5,6,16,17,18,30,34,41,48,49].includes(d.customer_id)) ||
            d.product_id == 3 && ([14,30,32,35].includes(d.customer_id)) ||
            d.product_id == 4 && ([2,28,36].includes(d.customer_id)) ||
            d.product_id == 5 && ([2,28,36].includes(d.customer_id))
            ){
            return "grey"
        }
        return 'steelblue'
    }
    function updateBar(){
        var product_id = d3.select("#product").property("value")
        if (product_id == 'All'){
            var barchartData = _.flatMap(_.groupBy(data.demand, d=>d.customer_id), d=>{
                return {customer_id: d[0].customer_id, demand: _.sum(d.map(v=>v.demand))}})
        } else {
            var barchartData = data.demand.filter(d=>{return d.product_id==product_id})
        }
        y.domain([0, d3.max(barchartData.map(d=>d.demand))])
        var t = d3.transition().duration(500)

        svg.selectAll(".axis--x")
          .call(xAxis)

        svg.selectAll(".axis--y")
          .call(yAxis)
          
        var bar =  g.selectAll(".bar")
                    .data(barchartData, d => d.customer_id)

        bar.attr("class", "bar update")
           .transition(t)
           .attr("x", d => x(d.customer_id))
           .attr("y", d => y(d.demand))
           .attr("fill", color)
           .attr("height", d => height-y(d.demand))

        bar.enter().append("rect")
            .attr("class", "bar enter")
            .attr("x", d => x(d.customer_id))
            .attr("width", x.bandwidth())
            .attr("y", d => y(d.demand))
            .attr("fill", color)
            .attr("height", d => height - y(d.demand))
            .on("mouseover", tip.show)
            .on("mouseout", tip.hide)
    }
    updateBar()

    function onProductChange(){
        updateBar()
    }

    var svg2 = d3.select("body").append("svg"),
          margin = {top: 20, right: 20, bottom: 30, left: 70},
          width2 = svgWidth - margin.left - margin.right,
          height2 = 1000 - margin.top - margin.bottom
    svg2.attr("width", width2)
        .attr("height", height2)

    projection = d3.geoAlbers()
                       .translate([width2/2, height2/2])
                       .scale([1500])
    var path = d3.geoPath(projection)

    x2 = d3.scaleLinear().rangeRound([0+100, width2 - 100])
    y2 = d3.scaleLinear().rangeRound([height2 - 100, 0+100])

    x2.domain(d3.extent(data.customers.map(d=>d.long)))
    y2.domain(d3.extent(data.customers.map(d=>d.lat)))
    
    var tip_circle = d3.tip().attr("class", "d3-tip").html(
        function(d){
        return `Customer ${d.customer_id} <br>
                ${d.city} ${d.state} <br>
                Product 1: ${d3.format(".2f")(_.find(data.demand, v=>v.customer_id==d.customer_id && v.product_id == 1).demand)} <br>
                Product 2: ${d3.format(".2f")(_.find(data.demand, v=>v.customer_id==d.customer_id && v.product_id == 2).demand)} <br>
                Product 3: ${d3.format(".2f")(_.find(data.demand, v=>v.customer_id==d.customer_id && v.product_id == 3).demand)} <br>
                Product 4: ${d3.format(".2f")(_.find(data.demand, v=>v.customer_id==d.customer_id && v.product_id == 4).demand)} <br>
                Product 5: ${d3.format(".2f")(_.find(data.demand, v=>v.customer_id==d.customer_id && v.product_id == 5).demand)} <br>
                Plant 1: ${d3.format(".2f")(_.find(data.dist_p2c, v=>v.customer_id==d.customer_id && v.plant_id == 1).dist)} <br>
                Plant 2: ${d3.format(".2f")(_.find(data.dist_p2c, v=>v.customer_id==d.customer_id && v.plant_id == 2).dist)} <br>
                Plant 3: ${d3.format(".2f")(_.find(data.dist_p2c, v=>v.customer_id==d.customer_id && v.plant_id == 3).dist)} <br>
                Plant 4: ${d3.format(".2f")(_.find(data.dist_p2c, v=>v.customer_id==d.customer_id && v.plant_id == 4).dist)} <br>
                `
        })
    d3.json("us-states.json", (error, json)=>{
        if (error) throw error
        svg2.selectAll("path")
            .data(json.features).enter()
            .append("path")
            .attr("d", path)
            .style("stroke", "#fff")
            .style("stroke-width", "1")
            .style("opacity", 0.3)

        svg2.selectAll("circle")
            .data(data.customers)
            .enter()
            .append("circle")
            .attr("cx", function(d){return projection([d.long, d.lat])[0]})
            .attr("cy", function(d){return projection([d.long, d.lat])[1]})
            .attr("r", 3)
            .style("fill", "steelblue")
            .attr("id", d=>"circle_"+d.customer_id)
            .on('mouseover', tip_circle.show)
            .on('mouseout', tip_circle.hide)

        svg2.selectAll("text.plant")
            .data(data.plants)
            .enter()
            .append("text")
            .attr("class", "plant")
            .attr("x", function(d){return projection([d.long, d.lat])[0]})
            .attr("y", function(d){return projection([d.long, d.lat])[1]})
            .text(function(d){return d.plant_id})
            .style("cursor", "default")
            .style("font-size", "10px")

        svg2.call(tip_circle)
        svg2.selectAll("text.cluster")
            .data(data.clusters)
            .enter()
            .append("text")
            .attr("class", "cluster")
            .attr("x", 0)
            .attr("y", (d,i)=>i*50+200)
            .text((d,i)=>"Cluster "+(i+1))
            .style("cursor", "pointer")
            .on("mouseover",d=> identifyClusters(d))
            .on("mouseout", clearAll)

        function identifyClusters(d){
            d.forEach(i =>{
                d3.selectAll("#circle_"+i)
                  .style("fill", "brown")
                  .attr("r", 10)
                  .attr("opacity", 0.5)
            })
        }
        function clearAll(){
            d3.selectAll("circle")
                .style("fill", "steelblue")
                .attr("r", 3)
                .attr("opacity", 1)
        }
    })


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
    
    function coverage_500(product_id){
        var plant_id = product_id == 5 ? 4 : product_id

        //array of customers within 500 miles
        var covered_customers = data.dist_p2c.filter(d=>d.dist <= 500 && d.plant_id == plant_id).map(d=>d.customer_id)

        //Actual demand covered
        var covered_demand = _.sum(data.demand.filter(d=>d.product_id == product_id && covered_customers.includes(d.customer_id)).map(d=>d.demand))

        return covered_demand/total_demand(product_id)
    }

    function calculate_demand(warehouses){

        //Set already covered customers' demands to 0        
        var demand_list = []
        for(let product=1;product<=5;product++){
            var plant_id = product == 5 ? 4 : product
            var covered_customers = data.dist_p2c.filter(d=>d.dist<=500 && d.plant_id == plant_id).map(d=>d.customer_id)
            demand_list.push(data.demand.filter(d=>d.product_id == product).map(d=>{
                return covered_customers.includes(d.customer_id) ? 0 :d.demand
            }))
        }
        var dist_matrix = []
        for (let customer of data.customers){
            var temp = data.dist_c2c.filter(d=>d.customer_from==customer.customer_id).sort((a,b)=>a.customer_to > b.customer_to).map(d => d.dist <= 500 ? 1 : 0)
            dist_matrix.push(temp)
        }
        var all_demand=math.matrix(demand_list)
        var covered = math.multiply(dist_matrix, warehouses).map(d => d > 0 ? 1 : 0)
        var output = math.multiply(all_demand, covered)._data
        var output_percent = output.map((d,i)=>(d/total_demand(i+1)))
        return [output, output_percent]
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
        possible_customers = [8,35,25,12,27,14,30,5,24,31,13,2]
        for (i=4;i<5;i++){
            var permut = getCombinations(possible_customers, i)
            for (let warehouse of permut){
                var warehouses = Array(50).fill(0)
                warehouse.forEach(i=>{
                    warehouses[i-1]=1
                });

                //Target percentage is used, because of baseline coverage from the plants
                var target_percentage = [.7115, .5732, .5257, .752, .7429]
                var output = calculate_demand(warehouses)[0]
                var output_percent = calculate_demand(warehouses)[1]
                if (output_percent.filter((d,i)=>d>=target_percentage[i]).length == 5 && _.sum(output)>338000){
                    // console.log(warehouse, _.sum(output), output_percent)
                    after_warehouse_percentage = output_percent
                }
            }
        }
        return after_warehouse_percentage
    }

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
            if (input_array.length == 0) {
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
            var cust = new Customer(d.customer_id, d.city, d.state, d.lat, d.long)
            cust.dist_p2c = dist_p2c.filter(v=>v.customer_id==d.customer_id) 
            cust.dist_c2c = dist_c2c.filter(v=>v.customer_from==d.customer_id)
        })

        plants = []
        plants_input.forEach(d=>{
            d.plant_id = +d.plant_id
            d.lat = +d.lat
            d.long = +d.long
            var plant = new Plant(d.plant_id, d.city, d.state, d.lat, d.long)
            plant.dist_p2c = dist_p2c.filter(v=>v.plant_id==d.plant_id)
            plants.push(plant)
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
}
