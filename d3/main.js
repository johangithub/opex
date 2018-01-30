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
        var demand_list = {}
        for (i=1;i<6;i++){
            demand_list[i] = data.demand.filter(d=>+d.product_id == i).map(d => +d.demand)
        }
        dist_matrix = []
        for (i=1;i<51;i++){
            var temp = data.dist_c2c.filter(d=>+d.customer_from==i).sort((a,b)=>+a.customer_to > +b.customer_to).map(d => +d.dist <= 500 ? 1 : 0)
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
        function bitwise_compare(a,b){
            for(let i=0;i<a.length;i++){
                if ((a[i]||b[i]) != a[i]){
                    return false
                }
            }
            //Dominates
            if (_.sum(a) >= _.sum(b)){
                return true
            } else {
                return false
            }
        }
        dist_ind = dist_matrix.map(row => row.map((d,i) => (i+1)).filter(ind=>row[ind-1]==1))
        dist_set = {}
        dist_ind.forEach((d,i)=>{
            dist_set[(i+1).toString()] = d
        })
        count=0
        cluster = []
        same_list = new Set()
        for (let i=1;i<50;i++){
            for (let j=i+1;j<51;j++){
                if ((_.isEqual(_.intersection(dist_set[i],dist_set[j]),dist_set[i])) || (_.isEqual(_.intersection(dist_set[i],dist_set[j]), dist_set[j]))){
                    if (_.isEqual(dist_set[i], dist_set[j])){
                        if (same_list.has(i)){
                            var ind = cluster.findIndex(d=>d.has(i))
                            cluster[ind].add(j)
                        } else if (same_list.has(j)){
                            var ind = cluster.findIndex(d=>d.has(j))
                            cluster[ind].add(i)

                        //Never seen
                        } else {
                            cluster.push(new Set([i, j]))
                        }
                        same_list.add(i)
                        same_list.add(j)

                        // console.log(`${i} is the same as ${j}`)

                    } else if (dist_set[i].length < dist_set[j].length){
                        console.log(`${j} strictly dominates ${i}`)
                    } else if (dist_set[i].length > dist_set[j].length){
                        console.log(`${i} strictly dominates ${j}`)
                    }
                }
            }
        }
        cluster.forEach((d,i)=>{
            console.log(i, d)
        })
        subset = {}
        strictly_dominated = []
        for (let i=0; i<50;i++){
            var temp = []
            for (let j=0; j<50; j++){
                if (bitwise_compare(dist_matrix[i], dist_matrix[j])){
                    temp.push(j+1)
                }
            }
            subset[i] = temp
            // console.log(`Customer ${i+1}: ${subset[i]}`)
            strictly_dominated = _.concat(strictly_dominated,temp)
        }
        subset_out = {}
        accounted_for = []
        for (let i = 0; i<49;i++){
            for (let j=i+1;j<50;j++){   
                if ((_.union(subset[i],subset[j]).length == subset[i].length) && (subset[i].length ==subset[j].length) && (i != j) && (!accounted_for.includes(j+1))){
                    accounted_for.push(j+1)
                    if ((i+1) in subset_out){
                        subset_out[i+1].push(j+1)
                    } else {
                        subset_out[i+1] = [i+1, j+1]
                    }
                    // console.log(i+1, j+1)
                }
            }
        }
        // strictly_dominated_set = new Set(strictly_dominated)
        // for (let i=0;i<50;i++){
        //     if (!strictly_dominated_set.has(i+1)){
        //     }
        // }

        

    }
    demand_covered()
    //
    // function triangulate(plant_id){
    //     var dist = data.dist_p2c.filter(d => d.plant_id == plant_id)
    //     dist.forEach(d => {
    //         d.lat = data.customers.filter(cust => cust.customer_id == d.customer_id)[0].lat
    //         d.long = data.customers.filter(cust => cust.customer_id == d.customer_id)[0].long
    //         d.dist_deg = mile_2_deg(d.dist)
    //     })
    //     function mile_2_deg(dist){
    //         return dist / 1.60934 / 85
    //     }
    //     console.log(dist[0].dist_deg)
    //     var A = math.matrix([
    //     [1,1, -2*dist[0].long, -2*dist[0].lat],
    //     [1,1, -2*dist[1].long, -2*dist[1].lat],
    //     [1,1, -2*dist[2].long, -2*dist[2].lat]
    //     ])
    //     var b = math.matrix([[dist[0].dist_deg ** 2 - dist[0].long ** 2 - dist[0].lat ** 2],
    //     [dist[1].dist_deg ** 2 - dist[1].long ** 2 - dist[1].lat ** 2],
    //     [dist[2].dist_deg ** 2 - dist[2].long ** 2 - dist[2].lat ** 2]])
    //     console.log(A, b)

    //     //(X'X)^-1 X'y
    //     console.log(math.multiply(math.transpose(A),A))

    // }
    // triangulate("1")

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

    svg2.call(tip_circle)

    svg2.selectAll("circle")
        .data(data.customers)
        .enter()
        .append("circle")
        .attr("cx", function(d){return x2(d.long)})
        .attr("cy", function(d){return y2(d.lat)})
        .attr("r", 3)
        .style("fill", "steelblue")
        .on('mouseover', tip_circle.show)
        .on('mouseout', tip_circle.hide)
    svg2.selectAll("text")
        .data(data.plants)
        .enter()
        .append("text")
        .attr("x", function(d){return x2(+d.long)})
        .attr("y", function(d){return y2(+d.lat)})
        .text(function(d){return d.plant_id})


}
