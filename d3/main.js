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
    data['demand'] = demand
    data['plants'] = plants
    data['products'] = products
    data['setup'] = setup
    data['customers'] = customers
    data['capacity'] = capacity
    data['dist_c2c'] = dist_c2c
    data['dist_p2c'] = dist_p2c

    // cost is $2 per mile per truck, in 10 tons. Rounding up for 10, we get the number of trucks required and miles
    // Math.ceil(data.demand[0].demand/10) * distance
    // console.log(Math.ceil(data.demand[0].demand/10))

    function closest_to_plant(plant_id){
        return data.dist_p2c.filter(d => d.plant_id ==plant_id).sort((a,b) => +a.dist>+b.dist)
    }

    //
    function total_demand(product_id){
        return d3.format('.2f')(d3.sum(data.demand.filter(d => +d.product_id == product_id).map(d => +d.demand)))
    }
    
    function coverage_500(product_id){
        var plant_id = product_id == '5' ? '4' : product_id

        //array of customers within 500 miles
        var covered_customers = data.dist_p2c.filter(dist => dist.plant_id == plant_id && +dist.dist <= 500).map(dist => dist.customer_id)

        //Actual demand covered
        covered_demand = data.demand.filter(d=>d.product_id == product_id && covered_customers.includes(d.customer_id)).map(d=>+d.demand).reduce((a,b)=> a + b, 0)

        // Set customers covered into plants data
        data.plants.filter(d=>d.plant_id == plant_id)[0].covered = covered_customers

        return d3.format(".2%")(covered_demand/total_demand(product_id))
    }

    // Base
    function demand_covered(){
        demand_list = {}
        for (i=1;i<6;i++){
            demand_list[i] = data.demand.filter(d=>+d.product_id == i).map(d => +d.demand)
        }
        dist_matrix = []
        for (i=1;i<51;i++){
            var temp = data.dist_c2c.filter(d=>+d.customer_from==i).sort((a,b)=>+a.customer_to > +b.customer_to).map(d => +d.dist <= 500 ? 1 : 0)
            dist_matrix.push(temp)
        }

        // //Product 1: 10, 19, 20, 27, 31
        // [10,19,20,27,31].forEach(d=>{
        //     demand_list[1][d-1] = 0
        // });

        // [5,6,16,17,18,30,34,41,48,49].forEach(d=>{
        //     demand_list[2][d-1] = 0
        // });

        // [14,30,32,35].forEach(d=>{
        //     demand_list[3][d-1] = 0
        // });

        // [2,28,36].forEach(d=>{
        //     demand_list[4][d-1] = 0
        // });

        // [2,28,36].forEach(d=>{
        //     demand_list[5][d-1] = 0
        // });

        dist=math.matrix(dist_matrix)
        var demand_coverage = []
        for (let i=0;i<50;i++){
            demand_coverage.push(math.dotMultiply(demand_list[1],dist_matrix[i]))
        }

        // demand=math.matrix([demand_list[1],demand_list[2],demand_list[3],demand_list[4],demand_list[5]])
        // warehouse=math.transpose(Array(50).fill(1))
        // B = math.multiply(dist,warehouse)
        // b=math.transpose(math.multiply(demand, math.multiply(dist,warehouse).map(d=>d>0 ? 1 : 0)))
        // A=math.multiply(demand, dist)
        // console.log(b._size, A._size)
        // a=numeric.solveLP(Array(50).fill(1),A, -1*b)
        // console.log(a)
        dist_ind = dist_matrix.map(row => row.map((d,i) => (i+1)).filter(ind=>row[ind-1]==1))
        dist_set = {}
        dist_ind.forEach((d,i)=>{
            dist_set[(i+1).toString()] = d
        })
        count=0
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

                        // console.log(`${i} is the same as ${j}`)

                    } else if (dist_set[i].length < dist_set[j].length){
                        // console.log(`${j} strictly dominates ${i}`)
                    } else if (dist_set[i].length > dist_set[j].length){
                        // console.log(`${i} strictly dominates ${j}`)
                    }
                }
            }
        }
        clusters.forEach((d,i)=>{
            console.log(i, d)
        })
    }
    demand_covered()

    function calculate_demand(warehouses){
        var demand=math.matrix([demand_list[1],demand_list[2],demand_list[3],demand_list[4],demand_list[5]])
        var covered = math.multiply(dist_matrix, warehouses).map(d=>d>0 ? 1 : 0)
        var output = math.multiply(demand, covered)._data
        var output_percent = output.map((d,i)=>(d/total_demand(i+1)))
        return output_percent
    }

    function getPermutations(array_in, size) {

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
        //{7|24|50}, 31, {13|47}]
        //Because others are strictly dominated
        // Of the identical sets, calculating mean distance shows which would be ideal
        //So only consider the following
        possible_customers = [8,35,28,25,12,27,14,30,5,24,31,47]
        for (i=4;i<5;i++){
            var permut = getPermutations(possible_customers, i)
            permut.forEach(warehouse=>{
                var warehouses = Array(50).fill(0)
                warehouse.forEach(i=>{
                    warehouses[i-1]=1
                });

                var output = calculate_demand(warehouses)
                if (output.filter(d=>d>.8).length == 5){
                    console.log(warehouse, output)
                }

            });
        }
        return
    }
    iterate_combinations()
    function calculate_mean_distance(customer_id){
        return d3.mean(data.dist_c2c.filter(d=> (+d.customer_from == customer_id) && (+d.dist <= 500)).map(d=>+d.dist))
    }
    function decide_city_within_cluster(){
        clusters.forEach((cluster, i)=>{
            var min_customer = -1
            var mean_d = 1000
            cluster.forEach(customer=>{
                if (mean_d > calculate_mean_distance(customer)){
                    min_customer = customer
                    mean_d = calculate_mean_distance(customer)
                }
            })
        })
    }
    decide_city_within_cluster()
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
            x.domain(data.demand.sort((a,b) => +a.demand < +b.demand).filter(d => d.product_id==product_id).map(d => d.customer_id))
        }
        updateBar(data.demand, product_id)   
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
                ' / Total Demand: '+total_demand(product_id) +
                 ' / 500-mile Coverage: '+coverage_500(product_id) + '<br>'
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
    y.domain([0, 13000])
    
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

    function updateBar(input,product_id){

        var barchartData = input.filter(d=>{return d.product_id==product_id})
        barchartData.forEach(d=>{
            d.demand = +d.demand
            d.revenue = +d.revenue
        })

        var t = d3.transition().duration(500)

        svg.selectAll(".axis--x")
          .call(xAxis)

        svg.selectAll(".axis--y")
          .call(yAxis)
          
        var bar =  g.selectAll(".bar")
                    .data(barchartData, function(d){return d.customer_id})

        bar.attr("class", "bar update")
           .transition(t)
           .attr("x", function(d){return x(d.customer_id)})
           .attr("y", function(d){return y(d.demand)})
           .attr("height", function(d){ return height-y(d.demand)})

        bar.enter().append("rect")
            .attr("class", "bar enter")
            .attr("x", function(d){return x(d.customer_id)})
            .attr("width", x.bandwidth())
            .attr("y", function(d){return y(d.demand)})
            .attr("height", function(d){return height - y(d.demand)})
            .on("mouseover", tip.show)
            .on("mouseout", tip.hide)

        var summaryData = {
            id: product_id,
            demand: d3.sum(barchartData.map(d => d.demand))
        }
    }

    updateBar(data.demand, d3.select("#product").property("value"))

    function onProductChange(){
        updateBar(data.demand, d3.select("#product").property("value"))
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

    x2.domain(d3.extent(data.customers.map(d=>+d.long)))
    y2.domain(d3.extent(data.customers.map(d=>+d.lat)))
    
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
            .attr("cx", function(d){return projection([+d.long, +d.lat])[0]})
            .attr("cy", function(d){return projection([+d.long, +d.lat])[1]})
            .attr("r", 3)
            .style("fill", "steelblue")
            .on('mouseover', tip_circle.show)
            .on('mouseout', tip_circle.hide)

        svg2.selectAll("text")
            .data(data.plants)
            .enter()
            .append("text")
            .attr("x", function(d){return projection([+d.long, +d.lat])[0]})
            .attr("y", function(d){return projection([+d.long, +d.lat])[1]})
            .text(function(d){return d.plant_id})
            .style("cursor", "default")
            .style("font-size", "10px")
        svg2.call(tip_circle)
    })

    // svg2.selectAll("circle")
    //     .data(data.customers)
    //     .enter()
    //     .append("circle")
    //     .attr("cx", function(d){return x2(d.long)})
    //     .attr("cy", function(d){return y2(d.lat)})
    //     .attr("r", 3)
    //     .style("fill", "steelblue")
    //     .on('mouseover', tip_circle.show)
    //     .on('mouseout', tip_circle.hide)


}
