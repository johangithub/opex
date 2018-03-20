var q = d3.queue()
         .defer(d3.csv, "data/data.csv")
         .defer(d3.csv, "data/unemployment.csv")
         .await(ready)

function ready(error, data, unemployment){
        // console.table(data)
        data.map(d=>{
            d.rate = +Object(_.find(unemployment, d2=> +d2.id == d.fips))['rate'] || 0
            d.pop = +d.pop
        })
        var uniqState = _.uniqBy(data, d=>d.state_name).map(d=>d.state_name)
        var stateData = []
        uniqState.forEach(d=>{
            let state_name = d
            var temp = {
                state_name: d,
                pop: _.sum(data.filter(v=>v.state_name==d).map(v=>v.pop)),
                rate: _.sum(data.filter(v=>v.state_name==d).map(v=>v.rate*v.pop))/_.sum(data.filter(v=>v.state_name==d).map(v=>v.pop))
            }
            stateData.push(temp)
        })
        var svgWidth = 1400
        var svgHeight = 800
        var margin = {top: 50, right: 20, bottom: 100, left: 70}
        var width = svgWidth - margin.left - margin.right
        var height = svgHeight - margin.top - margin.bottom

        // translates a linear scale of colors between two numbers into two different colors

        var color =  d3.scaleSequential()
        .domain([1.0,7.0])
        .interpolator(d3.interpolateBlues)

        // Add Sort bars
        var radio = d3.select("body")
                      .append("div")
                      .attr("id", "radios")
        radio.selectAll("label")
            .data(["State", "Population", "Unemployment"])
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
            if (checkedValue =='State'){
                x.domain(stateData.map(d=>d.state_name).sort())
            } else if (checkedValue == 'Population'){
                x.domain(stateData.sort((a,b) => a.pop < b.pop).map(d=>d.state_name))
            } else if (checkedValue == 'Unemployment'){
                x.domain(stateData.sort((a,b) => a.rate > b.rate).map(d=>d.state_name))
            }
            updateBar()   
        })

        var tip = d3.tip().attr("class", "d3-tip").html(d=>d.state_name+'<br>'+d3.format(".3s")(d.pop)+'<br>'+d3.format(".2%")(d.rate/100))
        var svg = d3.select("body")
             .append("svg")
             .attr("width", svgWidth)
             .attr("height", svgHeight)

        svg.call(tip)

        x = d3.scaleBand().range([0, width]).padding(0.1)
        y = d3.scaleLinear().rangeRound([height, 0])
        x.domain(stateData.map(d => d.state_name))
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
        .attr("y", 7)
        .attr("fill","black")
        .attr("dy", "0.71em")
        .attr("text-anchor", "end")
        .text("Population")

          // Color scale legend
          g.append("text")
              .attr("class", "legend")
              .attr("x", (width / 2))
              .attr("y", -30)
              .attr("text-anchor", "middle")    
              .style("font-size", "1em")  
              .text("2% . . . . . . . . . . 7%")

          //these 7 rect represents each box on the legend
          //positions are hardcoded, which is not ideal
          for (var i = 1; i <= 6; i++) {
            g.append("rect")
            .attr("x", i*20+(width/2)-80)
            .attr("y", -20)
            .attr("height", 10)
            .attr("width", 20)
            .attr("fill", color(i+1))
          }

        updateBar()
        function updateBar(){
            y.domain([0, d3.max(stateData.map(d=>d.pop))])
            var t = d3.transition().duration(500)

            svg.selectAll(".axis--x")
              .call(xAxis)

            svg.selectAll(".axis--y")
              .call(yAxis)

              
            var bar =  g.selectAll(".bar")
                        .data(stateData, d => d.state_name)
            bar.attr("class", "bar update")
               .transition(t)
               .attr("x", d => x(d.state_name))
               .attr("y", d => y(d.pop))
               .attr("fill", d => color(d.rate))
               .attr("height", d => height-y(d.pop))

            bar.enter().append("rect")
                .attr("class", "bar enter")
                .attr("x", d => x(d.state_name))
                .attr("width", x.bandwidth())
                .attr("y", d => y(d.pop))
                .attr("fill", d => color(d.rate))
                .attr("height", d => height - y(d.pop))
                .on("mouseover", tip.show)
                .on("mouseout", tip.hide)
        }
}