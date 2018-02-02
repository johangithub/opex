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

function ready(error, demand, plants, products, setup, customers, capacity, dist_c2c, dist_p2c){
    if (error) throw error
    //Preprocessing
    demand.forEach(d=>{
        d.customer_id = +d.customer_id
        d.product_id = +d.product_id
        d.demand = +d.demand
        d.revenue = +d.revenue
    })
    customers.forEach(d=>{
        d.customer_id = +d.customer_id
        d.lat = +d.lat
        d.long = +d.long
    })
    capacity.forEach(d=>{
        d.plant_id = +d.plant_id
        d.product_id = +d.product_id
        d.capacity = +d.capacity
        d.cost = +d.cost
    })
    dist_p2c.forEach(d=>{
        d.customer_id = +d.customer_id
        d.plant_id = +d.plant_id
        d.dist = +d.dist
    })
    setup.forEach(d=> {
        d.from = +d.from
        d.to = +d.to
        d.days = +d.days
        d.cost = d.days * 5000
    })
    dist_c2c.forEach(d=>{
        d.dist = +d.dist
        d.customer_from = +d.customer_from
        d.customer_to = +d.customer_to
    })

    data['demand'] = demand
    data['plants'] = plants
    data['products'] = products
    data['setup'] = setup
    data['customers'] = customers
    data['capacity'] = capacity
    data['dist_c2c'] = dist_c2c
    data['dist_p2c'] = dist_p2c


    function closest_to_plant(plant_id){
        return data.dist_p2c.filter(d => d.plant_id ==plant_id).sort((a,b) => a.dist>b.dist)
    }

    //
    function total_demand(product_id){
        return d3.format('.2f')(_.sum(data.demand.filter(d => d.product_id == product_id).map(d => d.demand)))
    }
    
    function coverage_500(product_id){
        var plant_id = product_id == '5' ? '4' : product_id

        //array of customers within 500 miles
        var covered_customers = data.dist_p2c.filter(dist => dist.plant_id == plant_id && +dist.dist <= 500).map(dist => dist.customer_id)

        //Actual demand covered
        covered_demand = data.demand.filter(d=>d.product_id == product_id && covered_customers.includes(d.customer_id)).map(d=>d.demand).reduce((a,b)=> a + b, 0)

        // Set customers covered into plants data
        data.plants.filter(d=>d.plant_id == plant_id)[0].covered = covered_customers

        return covered_demand/total_demand(product_id)
    }

    // Base
    function demand_covered(){
        demand_list = {}
        for (let i=1;i<=5;i++){
            demand_list[i] = data.demand.filter(d=>d.product_id == i).map(d => d.demand)
        }
        dist_matrix = []
        for (let i=1;i<=50;i++){
            var temp = data.dist_c2c.filter(d=>d.customer_from==i).sort((a,b)=>a.customer_to > b.customer_to).map(d => d.dist <= 500 ? 1 : 0)
            dist_matrix.push(temp)
        }

        //Product 1: 10, 19, 20, 27, 31
        [10,19,20,27,31].forEach(d=>{
            demand_list[1][d-1] = 0
        });

        [5,6,16,17,18,30,34,41,48,49].forEach(d=>{
            demand_list[2][d-1] = 0
        });

        [14,30,32,35].forEach(d=>{
            demand_list[3][d-1] = 0
        });

        [2,28,36].forEach(d=>{
            demand_list[4][d-1] = 0
        });

        [2,28,36].forEach(d=>{
            demand_list[5][d-1] = 0
        });

        dist=math.matrix(dist_matrix)

        dist_set = {}
        for (let customer=1;customer<=50;customer++){
            dist_set[customer] = data.dist_c2c.filter(d=>d.dist<=500 && d.customer_from == customer).map(d=>d.customer_to)
        }

        console.log(dist_set)
        clusters = []
        same_list = new Set()
        for (let i=1;i<50;i++){
            for (let j=i+1;j<51;j++){
                if ((_.isEqual(_.intersection(dist_set[i],dist_set[j]),dist_set[i])) || (_.isEqual(_.intersection(dist_set[i],dist_set[j]), dist_set[j]))){
                    if (_.isEqual(dist_set[i], dist_set[j])){
                        if (same_list.has(i)){
                            var ind = clusters.findIndex(d=>d.has(i))
                            clusters[ind].add(j)
                        } else if (same_list.has(j)){
                            var ind = clusters.findIndex(d=>d.has(j))
                            clusters[ind].add(i)

                        //Never seen
                        } else {
                            clusters.push(new Set([i, j]))
                        }
                        same_list.add(i)
                        same_list.add(j)
                    }
                }
            }
        }
    }
    demand_covered()

    function calculate_demand(warehouses){
        var demand=math.matrix([demand_list[1],demand_list[2],demand_list[3],demand_list[4],demand_list[5]])
        var covered = math.multiply(dist_matrix, warehouses).map(d=>d>0 ? 1 : 0)
        var output = math.multiply(demand, covered)._data
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

    after_warehouse_percentage = {}
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
            permut.forEach(warehouse=>{
                var warehouses = Array(50).fill(0)
                warehouse.forEach(i=>{
                    warehouses[i-1]=1
                });

                var target_percentage = [.7115, .5732, .5257, .752, .7429]
                var output = calculate_demand(warehouses)[0]
                var output_percent = calculate_demand(warehouses)[1]
                if (output_percent.filter((d,i)=>d>=target_percentage[i]).length == 5 && _.sum(output)>338000){
                    console.log(warehouse, _.sum(output), output_percent)
                    after_warehouse_percentage = output_percent
                }

            });
        }
        return
    }
    iterate_combinations()
    function calculate_mean_distance(customer_id){
        return d3.mean(data.dist_c2c.filter(d=> (d.customer_from == customer_id) && (d.dist <= 500)).map(d=>d.dist))
    }
    function calculate_demand_cost(customer_id){
        customers_to_be_served = data.dist_c2c.filter(d=> (d.customer_from == customer_id) && (d.dist <= 500)).map(d=>d.customer_to)
        var weighted_cost = 0
        customers_to_be_served.forEach(customer =>{
            demand_served = _.sum(data.demand.filter(d=>d.customer_id==customer).map(d=>d.demand))
            distance = data.dist_c2c.filter(d=> (d.customer_to==customer) && (d.customer_from ==customer_id)).map(d=>d.dist)[0]
            weighted_cost += Math.ceil(demand_served/10)* distance * 2 
        })
        return weighted_cost
    }

    function decide_city_within_cluster(){
        clusters.forEach((cluster, i)=>{
            var min_customer = -1
            var cost = 1e10
            cluster.forEach(customer=>{
                if (cost > calculate_demand_cost(customer)){
                    min_customer = customer
                    cost = calculate_demand_cost(customer)
                }
            })
        // console.log(cluster, min_customer)
        })
    }
    // decide_city_within_cluster()

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
        return data.setup.filter(d=>d.from==from && d.to==to)[0].days
    }
        var permArr = []
        var usedChars = []

        var permut_input = possible_products
        permut_input.splice(possible_products.indexOf(start_product),1)
        var permutations = permute(permut_input)
        var cost = 1000
        var best_candidate = []
        permutations.forEach(cycle=>{
            // Iterate through all possible permutations of cycle to get the best cycling
            var temp_cost = setup_cost(start_product,cycle[0])
            for (let i=0; i<3;i++){
                temp_cost += setup_cost(cycle[i],cycle[i+1])
            }

            temp_cost += setup_cost(cycle[3],start_product)
            if (cost > temp_cost){
                cost = temp_cost
                best_candidate = cycle
            }
    })
    console.log(start_product, best_candidate, cost)
}
best_cycling_products(1,[1,2,3,4,5])

    production_cost_per_ton = {
            1: 500,
            2: 400,
            3: 300,
            4: 200,
            5: 100
    }

    function simulate_fulfillment(scenario){
        //4 quarters. 5 Products. 4 Plants.
        q_profit = {}
        available_plants = {1: [1], 2: [2], 3: [3], 4: [4], 5: [4]}
        var upgrade_cost = 0
        var upgraded = []
        if (scenario=='all_upgrade'){
            upgraded = [1,2,3,4]
            upgrade_cost = upgraded.length * 10000000
            //determine closest available plant for any product.
            //If upgraded, available. If not, only the original servicing plant is available.
            for (let product=1;product<=5;product++){
                available_plants[product] = _.union(available_plants[product],upgraded).sort()
            }
        }

        //Pick the closest plants given the available plants for each demand
        //and calculate quarterly demand
        //Transport cost is  $2/mile with 10 ton truck each

        var quarterly_demand = _.map(data.demand, d=>{
            //All availble plants for that demand
            var all_available_plants = data.dist_p2c.filter(p2c=>p2c.customer_id == d.customer_id && (available_plants[d.product_id].includes(p2c.plant_id)))
            //Minimum among all available plants
            var min_dist_plant = _.minBy(all_available_plants, d=>d.dist)
            _.assign(d, min_dist_plant)
            d.quarterly_demand = d.demand / 4
            d.quarterly_transport_cost = d.dist*2*Math.ceil(d.quarterly_demand/10)
            d.quarterly_revenue = d.quarterly_demand * d.revenue
            return d
        })


        //Determine if each plant can fulfill the quarterly demand. If not, must go into overtime or fetch from other plant
        for (let plant=1;plant<=4;plant++){
            for (let product=1;product<=5;product++){

            // console.log(`Plant: ${plant}, Product: ${product}, ${_.sum(quarterly_demand.filter(d=>(d.product_id==product)&&d.plant_id ==plant).map(d=>d.quarterly_demand))}`)
            }
        }

        function production_cost(product){
            if (product==1){
                return 72000*production_cost_per_ton[1] + (_.sum(quarterly_demand.filter(d=>d.product_id==1).map(d=>d.quarterly_demand))-72000) * production_cost_per_ton[1]*1.5
            } else if (product == 2){
                return 18000*production_cost_per_ton[2]
            } else if (product == 3){
                return 7500*production_cost_per_ton[3]
            } else if (product == 4){
                return 3000*production_cost_per_ton[4] + 5000*8
            } else if (product == 5){
                return  1500*production_cost_per_ton[5] + 5000*6
            }
        }

        var total_q_profit = 0
        var total_q_transport_cost = 0
        var total_q_revenue = 0
        var total_q_production_cost = 0
        for (let product=1;product<=5;product++){
            var product_demands = quarterly_demand.filter(d=>d.product_id==product)
            var transport_cost = product_demands.map(d=>d.quarterly_transport_cost)
            var q_production_cost = production_cost(product)
            var q_revenue = product_demands.map(d=>d.quarterly_revenue)
            total_q_profit += _.sum(q_revenue)-_.sum(transport_cost)-q_production_cost
            total_q_transport_cost += _.sum(transport_cost)
            total_q_revenue += _.sum(q_revenue)
            total_q_production_cost += q_production_cost
        }

        return {
            profit: total_q_profit * 4 - upgrade_cost,
            transport_cost: total_q_transport_cost * 4,
            upgrade_cost: upgrade_cost,
            revenue: total_q_revenue * 4,
            production_cost: total_q_production_cost * 4
        }
    }
    var scenarios = ['baseline','all_upgrade']
    for (let i=0;i<scenarios.length;i++){
        var result = simulate_fulfillment(scenarios[i])
        function formatNum(number){
            return d3.format(".5s")(number)
        }
        console.log(`Scenario ${scenarios[i]}--Profit: ${formatNum(result.profit)} / Production Cost: ${formatNum(result.production_cost)} / Transportation Cost: ${formatNum(result.transport_cost)} / Upgrade Cost: ${formatNum(result.upgrade_cost)}`)
    }


    var svgWidth = 1400
    var svgHeight = 500

    // Add product selection
    var select = d3.select("body").append("select")
                   .attr("id", "product")
                   .style("top", "10px")
                   .on("change", onProductChange)

    select.selectAll("option")
        .data(['1','2','3','4','5']).enter()
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
        var checkedValue = [...document.getElementsByName("sort")].filter(d => d.checked)[0].value
        var product_id =  d3.select("#product").property("value")
        if (checkedValue =='customer_id'){
            x.domain(_.range(1,51))
        } else if (checkedValue == 'demand'){
            x.domain(data.demand.sort((a,b) => a.demand < b.demand).filter(d => d.product_id==product_id).map(d => d.customer_id))
        }
        updateBar(data.demand, product_id)   
    })

    var simulate = d3.select("body")
                    .append("div")
                    .attr("id", "simulate")

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
                ' / Total Demand: '+total_demand(product_id) +
                 ' / 500-mile Coverage: '+d3.format(".2%")(coverage_500(product_id)) + ' / With warehouses: '+d3.format(".2%")(after_warehouse_percentage[product_id-1]+coverage_500(product_id)) +'<br>'
                })

    var svg = d3.select("body").append("svg"),
          margin = {top: 20, right: 20, bottom: 30, left: 70},
          width = svgWidth - margin.left - margin.right,
          height = svgHeight - margin.top - margin.bottom
    svg.attr("width", svgWidth)
       .attr("height", svgHeight)

    var tip = d3.tip().attr("class", "d3-tip").html(
        function(d){
            var customer = data.customers.filter(customer => customer.customer_id == d.customer_id)[0]
         return "Customer "+customer.customer_id+"<br>"+
                customer.city+","+customer.state+" "+customer.zip+"<br>"+
                d.demand +' tons'
                        }
        )

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
        if (d.product_id == 1 && [10,19,20,27,31].includes(d.customer_id) ||
            d.product_id == 2 && [5,6,16,17,18,30,34,41,48,49].includes(d.customer_id) ||
            d.product_id == 3 && [14,30,32,35].includes(d.customer_id) ||
            d.product_id == 4 && [2,28,36].includes(d.customer_id) ||
            d.product_id == 5 && [2,28,36].includes(d.customer_id)
            ){
            return "grey"
        }
        return 'steelblue'
    }
    function updateBar(product_id){
        var product_id = d3.select("#product").property("value")
        var barchartData = data.demand.filter(d=>{return d.product_id==product_id})
        barchartData.forEach(d=>{
            d.demand = d.demand
            d.revenue = d.revenue
        })

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

        var summaryData = {
            id: product_id,
            demand: _.sum(barchartData.map(d => d.demand))
        }
    }

    updateBar()

    function onProductChange(){
        updateBar( d3.select("#product").property("value"))
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
         return "Customer "+d.customer_id+"<br>"+
                d.city+","+d.state+" "+d.zip+"<br>"
                        }
        )
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
            .data(clusters)
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

}
