
var width = screen.width - 100
d3.select("#container").style("margin", "10px")
// load data from a csv file
d3.csv("data/data.csv", data => {
  data.forEach(d=>{
    d.state = state_name[d.state_name]
    d.pop = +d.pop
  })
  d3.json("data/us-states.json", statesJson => {

  // Run the data through crossfilter and load our 'facts'
  var facts = crossfilter(data)
  var all = facts.groupAll()

  //////Title row
  var titleSpan = d3.select("#title").append("div")
    .attr("class", "dc-data-count")
    .style("float", "left")
    .append("h4")
    .text("USA Counties ")
    .append("span")
    
    titleSpan.append("span").attr("class", "filter-count")
    titleSpan.append("text").text(" counties selected out of ")
    titleSpan.append("span").attr("class", "total-count")
    titleSpan.append("text").text(" |")
    titleSpan.append("a")
    .attr("href", 'javascript:dc.filterAll();dc.redrawAll();')
    .text(" Reset All")

  // count all the facts
  dc.dataCount(".dc-data-count")
    .dimension(facts)
    .group(all)

  //////// Row 1
  var row1Height = 500

  row1Charts = {}

  //Choropleth
   d3.select("#row1").append("div")
    .attr("id", 'dc-choropleth')
    .append("h4")
    .text("By State")
    .append("span")
    .append("a")
    .attr("class","reset")
    .style("display", "none")
    .attr("href", `javascript:row1Charts['state'].chart.filterAll();dc.redrawAll();`)
    .text(" reset")

    row1Charts['state'] = {
      chart: dc.geoChoroplethChart("#dc-choropleth"),
      dim : facts.dimension(d => d.state_name)
    }
    
    var stateGroup = row1Charts['state'].dim.group().reduceSum(d=>d.pop)


  row1Charts['state'].chart.width(width)
    .height(row1Height)
    // .margins({top: 10, right: 10, bottom: 30, left: 40})
    .dimension(row1Charts['state'].dim)
    .group(stateGroup)
    .colors(d3.scale.quantize().range(["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"]))
    .colorDomain([0, 1e7])
    .overlayGeoJson(statesJson.features, "state", d=>d.properties.name)
    .valueAccessor(function(kv) {
        return kv.value;
    })
    .title(function (d) {
        return "State: " + d.key + "\nTotal Population: " + d3.format(".2s")(d.value ? d.value : 0);
    });

var row2Height = 300
row2Charts = {}
  // States
   d3.select("#row1").append("div")
    .attr("id", 'dc-states-chart')
    .append("h4")
    .text("States")
    .append("span")
    .append("a")
    .attr("class","reset")
    .style("display", "none")
    .attr("href", `javascript:row2Charts['state'].chart.filterAll();dc.redrawAll();`)
    .text(" reset")

    row2Charts['state'] = {
      chart: dc.barChart("#dc-states-chart"),
      dim: facts.dimension(d => d.state_name)
    }
    row2Charts['state']['group'] = row2Charts['state'].dim.group().reduceSum(d=>d.pop)

  // TIS Bar Graph Counted
  row2Charts['state'].chart.width(width)
    .height(row2Height)
    .margins({top: 10, right: 10, bottom: 100, left: 80})
    .dimension(row2Charts['state'].dim)
    .group(row2Charts['state'].group)
    .x(d3.scale.ordinal())
    .xUnits(dc.units.ordinal)
    // .centerBar(true)  
    .brushOn(false)
    .gap(5)  // 65 = norm
    .elasticY(true)

  var headers = [{name: 'State',var_name: 'state_name', width: 100},
  {name: 'County',var_name: 'county_name', width: 300},
  {name: 'Population', var_name: 'pop', width: 80}]

    // export button
  d3.select("#table")
    .insert("a")
    .attr("id", "export")
    .attr("href", "#")
    .attr("class", "btn btn-success")
    .text("Export")
    .style("cursor", "pointer")
    .style("float", "right")

  var table = d3.select("#table")
    .append("table")
    .attr("id", "dc-data-table")
    .attr("class", "table table-hover")
    .style("background", "#eee")
    .style("table-layout", "fixed")
    .style("text-align", "left")
    .append("thead")
    .append("tr")
    .attr("class", "header")
    .style("padding", "0px")
    .style("background-color", "#ddd")
    .style("color", "#333")

  var table_sortvar = ''
  table.selectAll("th")
    .data(headers).enter()
    .append("th")
    .attr("class", (d, i) => '_'+i+' th_'+d.name)
    .text(d => d.name)
    .style("float", "left")
    .style("line-height", "1em")
    .style("border", "0px")
    .style("padding", "5px")
    .style("font-weight", "normal")
    .style("cursor", "pointer")
    .on("click", v=>{
      dataTable.sortBy(d=>d[v.var_name])
      if (table_sortvar == v.var_name){
        dataTable.order(d3.descending)
      } else {
        table_sortvar = v.var_name
        dataTable.order(d3.ascending)
      }
      dataTable.render()
    })

  dataTable = dc.dataTable("#dc-data-table")
  tableDim = facts.dimension(d => d.county_name)
  dataTable.width(width)
    .dimension(tableDim)
    .group(d => 'Showing only first 500 selections')
    .showGroups(false)
    .size(Infinity)
    // Return an array of function that returns each variable name
    .columns(headers.map(d => (v)=>v[d.var_name]))
    .sortBy(d => d.county_name)
    .order(d3.ascending)
    .on('postRender', setTableStyle)
    .on('postRedraw', setTableStyle)

    // Table styling 
    function setTableStyle(){
      d3.selectAll("#dc-data-table tbody")
      .style("display", "block")
      .style("height", "500px")
      .style("overflow-y", "auto")
      .style("overflow-x", "hidden")
      headers.forEach((d, i)=>{
        d3.selectAll("._"+i)
          .style("width", headers[i].width+"px")
      })
      d3.selectAll("#dc-data-table td")
      .style("cursor", "pointer")
      .style("color", "#333")
      .style("font-size", "13px")
      .style("border", "0px")
      .style("float", "left")
      .style("line-height", "1em")
      .style("border", "0px")
      .style("padding", "5px")
    }

    d3.selectAll("#export")
      .on("click", exportAll)
    function exportAll() {
      // prepare CSV data
      var csvData = new Array();
      csvData.push('"'+headers.map(d=>d.name).join('","')+'"');
      var outData = tableDim.top(Infinity).sort((a,b)=>a.county_name>b.county_name)
      outData.forEach(county => {
        var outString = '"'
        headers.map(d=>d.var_name).forEach(variable => {
          // console.log(county, variable)
          outString += county[variable] + '","'
        })
        csvData.push(outString.slice(0,outString.length-2))
      })
      var fileName = "export.csv";
      var buffer = csvData.join("\n");
      var blob = new Blob([buffer], {"type": "text/csv;charset=utf8;"})
      link = document.getElementById("export");
      if (link.download !== undefined) { // feature detection
        // Browsers that support HTML5 download attribute
        link.setAttribute("href", window.URL.createObjectURL(blob));
        link.setAttribute("download", fileName);
      } else {
        link.setAttribute("href", "http://www.example.com/export");
      }
    }


//   // Max ADSC
//   d3.select("#row1").append("div")
//    .attr("id", 'dc-adsc-chart')
//    .append("h4")
//    .text("Years Until Separation Eligible")
//    .append("span")
//    .append("a")
//    .attr("class","reset")
//    .style("display", "none")
//    .attr("href", `javascript:row1Charts['adsc'].chart.filterAll();dc.redrawAll();`)
//    .text(" reset")

//   var maxyr_until_sep = 5
//   row1Charts['adsc'] = {
//     chart: dc.barChart("#dc-adsc-chart"),
//     dim : facts.dimension(function(d){
//       if (+d.years_until_separation_eligible > maxyr_until_sep){
//         return maxyr_until_sep - .1
//       }
//       return +d.years_until_separation_eligible
//     })
//   }
//  row1Charts['adsc'].group = {
//     all: ()=>row1Charts['adsc'].dim.group().top(Infinity).filter(d => d.key != "")
//   }

//   row1Charts['adsc'].chart.width(width/4)
//     .height(row1Height)
//     .margins({top: 10, right: 10, bottom: 20, left: 40})
//     .dimension(row1Charts['adsc'].dim)
//     .group(row1Charts['adsc'].group)
//     .x(d3.scale.linear().domain([0,maxyr_until_sep]))
//     .gap(95)
//     .elasticY(true)


//   // Time On Station
//     d3.select("#row1").append("div")
//    .attr("id", 'dc-tos-chart')
//    .append("h4")
//    .text("Time on Station")
//    .append("span")
//    .append("a")
//    .attr("class","reset")
//    .style("display", "none")
//    .attr("href", `javascript:row1Charts['tos'].chart.filterAll();dc.redrawAll();`)
//    .text(" reset")
//   var maxTOS = 5
//   row1Charts['tos'] = {
//     chart: dc.barChart("#dc-tos-chart"),
//     dim: facts.dimension(d => {
//       return d.time_on_station < maxTOS ? d.time_on_station : maxTOS-.01
//     })
//   }
//   // Time on Station Bar Graph Counted
//   row1Charts['tos'].chart.width(width/4)
//     .height(row1Height)
//     .margins({top: 10, right: 10, bottom: 20, left: 40})
//     .dimension(row1Charts['tos'].dim)
//     .group(row1Charts['tos'].dim.group()) 
//     .gap(95)  // 65 = norm
//     .x(d3.scale.linear().domain([0, maxTOS]))
//     .elasticY(true)
//     .xAxis().ticks(6)

// //////// Row 2
//   var row2height = 100
//   row2Charts = {}

//   // Max ADSC
//   d3.select("#row2").append("div")
//    .attr("id", 'dc-sep-ret-chart')
//    .append("h4")
//    .text("SEP/RET")
//    .append("span")
//    .append("a")
//    .attr("class","reset")
//    .style("display", "none")
//    .attr("href", `javascript:row2Charts['sep_ret'].chart.filterAll();dc.redrawAll();`)
//    .text(" reset")

//   row2Charts['sep_ret'] = {
//     chart: dc.rowChart("#dc-sep-ret-chart"),
//     dim: facts.dimension(d => d.separation_eligibility)
//   }
//   row2Charts['sep_ret']['group'] = {
//     all: ()=>row2Charts['sep_ret'].dim.group().top(Infinity).filter(d => d.key != "")
//   }

//   row2Charts['sep_ret'].chart.width(150)
//     .height(row2height)
//     .margins({top: 5, left: 10, right: 10, bottom: 20})
//     .dimension(row2Charts['sep_ret'].dim)
//     .group(row2Charts['sep_ret'].group)
//     .colors(d3.scale.category10())
//     .label(d => d.key)
//     .elasticX(true)
//     .ordering(d => d.key)
//     .xAxis().ticks(2)

//   ///PME
//   d3.select("#row2").append("div")
//    .attr("id", 'dc-pme-chart')
//    .append("h4")
//    .text("PME")
//    .append("span")
//    .append("a")
//    .attr("class","reset")
//    .style("display", "none")
//    .attr("href", `javascript:row2Charts['pme'].chart.filterAll();dc.redrawAll();`)
//    .text(" reset")

//   row2Charts['pme'] = {
//     chart: dc.rowChart("#dc-pme-chart"),
//     dim: facts.dimension(d => d.pme_complete)
//   }
//   row2Charts['pme']['group'] = {
//     all: ()=>row2Charts['pme'].dim.group().top(Infinity).filter(d => d.key != "")
//   }

//   row2Charts['pme'].chart.width(150)
//     .height(row2height)
//     .margins({top: 5, left: 10, right: 10, bottom: 20})
//     .dimension(row2Charts['pme'].dim)
//     .group(row2Charts['pme'].group)
//     .colors(d3.scale.category10())
//     .label(d => d.key)
//     .elasticX(true)
//     .ordering(d => d.key)
//     .xAxis().ticks(2)

//   ///PME
//   d3.select("#row2").append("div")
//    .attr("id", 'dc-bpz-chart')
//    .append("h4")
//    .text("BPZ")
//    .append("span")
//    .append("a")
//    .attr("class","reset")
//    .style("display", "none")
//    .attr("href", `javascript:row2Charts['bpz'].chart.filterAll();dc.redrawAll();`)
//    .text(" reset")

//   row2Charts['bpz'] = {
//     chart: dc.rowChart("#dc-bpz-chart"),
//     dim: facts.dimension(d => d.below_zone_promotion)
//   }
//   row2Charts['bpz']['group'] = {
//     all: ()=>row2Charts['bpz'].dim.group().top(Infinity).filter(d => d.key != "NO BPZ")
//   }

//   row2Charts['bpz'].chart.width(150)
//     .height(row2height)
//     .margins({top: 5, left: 10, right: 10, bottom: 20})
//     .dimension(row2Charts['bpz'].dim)
//     .group(row2Charts['bpz'].group)
//     .colors(d3.scale.category10())
//     .label(d => d.key)
//     .elasticX(true)
//     .ordering(d => d.key)
//     .xAxis().ticks(2)

//   d3.select("#row2").append("div")
//     .attr("id", 'dc-vml-chart')
//     .append("h6")
//     .text("VML")
//     .append("span")
//     .append("a")
//     .attr("class","reset")
//     .style("display", "none")
//     .attr("href", `javascript:row2Charts['vml'].chart.filterAll();dc.redrawAll();`)
//     .text(" reset")

//   row2Charts['vml'] = {
//     chart: dc.rowChart('#dc-vml-chart'),
//     dim: facts.dimension(d => d.vml)
//   }

//   row2Charts['vml'].chart.width(width/18)
//     .height(row2height)
//     .margins({top: 5, left: 10, right: 10, bottom: 20})
//     .dimension(row2Charts['vml'].dim)
//     .group(row2Charts['vml'].dim.group())
//     .colors(d3.scale.category10())
//     .elasticX(true)
//     .ordering(d => d.value)
//     .xAxis().ticks(2)
  
//   function ucFirstLetter(string){
//     return string.charAt(0).toUpperCase() + string.slice(1);
//   }
//     var intel_experiences = ['wic','sof','acq','space','tgt','sigint','aoc','cyber']
//     intel_experiences.forEach(exp => {
//       d3.select("#row2").append("div")
//         .attr("id", `dc-${exp}-chart`)
//         .append("h6")
//         .text(`${exp.toUpperCase()}`)
//         .append("span")
//         .append("a")
//         .attr("class","reset")
//         .style("display", "none")
//         .attr("href", `javascript:row2Charts['${exp}'].chart.filterAll();dc.redrawAll();`)
//         .text(" reset")
      
//       row2Charts[exp] = {
//         chart: dc.rowChart(`#dc-${exp}-chart`),
//         dim: facts.dimension(d => d['intel_'+exp])
//       }

//       row2Charts[exp].chart.width(width/20)
//         .height(row2height)
//         .margins({top: 5, left: 10, right: 10, bottom: 20})
//         .dimension(row2Charts[exp].dim)
//         .group(row2Charts[exp].dim.group())
//         .colors(d3.scale.category10())
//         .elasticX(true)
//         .ordering(d => d.value)
//         .xAxis().ticks(2)
//     })




// // Render all language charts including html
//   languageCharts ={}
//   var languageList = ['spanish', 'german', 'french', 'korean','japanese','chinese','russian','hindi','indonesian','arabic']
  
//   languageList.forEach(language => {
//     d3.select("#language").append("div")
//     .attr("id", `dc-${language}-chart`)
//     .append("h6")
//     .text(ucFirstLetter(language))
//     .append("span")
//     .append("a")
//     .attr("class","reset")
//     .style("display", "none")
//     .attr("href", `javascript:languageCharts['${language}'].chart.filterAll();dc.redrawAll();`)
//     .text(" reset")
//     languageCharts[language] ={
//       chart: dc.rowChart(`#dc-${language}-chart`),
//       dim: facts.dimension(function(d){
//         return d[language] > 0 ? 'Above 2/2' : 'Below 2/2'
//       })
//     }
//     languageCharts[language].chart.width(width/18)
//       .height(row2height)
//       .margins({top: 5, left: 10, right: 10, bottom: 20})
//       .dimension(languageCharts[language].dim)
//       .group(languageCharts[language].dim.group())
//       .colors(d3.scale.category10())
//       .label(d => d.key)
//       .elasticX(true)
//       .ordering(d => d.key)
//       .xAxis().ticks(2)
//   })


//   //////// Row 3
//   row3Charts = {}
//   var row3height = 200

//   d3.select("#row3").append("div")
//     .attr("id", 'dc-grade-chart')
//     .append("h6")
//     .text("GRD")
//     .append("span")
//     .append("a")
//     .attr("class","reset")
//     .style("display", "none")
//     .attr("href", `javascript:row3Charts['grade'].chart.filterAll();dc.redrawAll();`)
//     .text(" reset")
    
//   row3Charts['grade'] = {
//     chart: dc.rowChart('#dc-grade-chart'),
//     dim: facts.dimension(d => d.grade)
//   }

//   // Grade
//   row3Charts['grade'].chart.width(100)
//     .height(row3height)
//     .margins({top: 5, left: 10, right: 10, bottom: 20})
//     .dimension(row3Charts['grade'].dim)
//     .group(row3Charts['grade'].dim.group())
//     .colors(d3.scale.category10())
//     .label(d => d.key)
//     .elasticX(true)
//     .ordering(d => d.key)
//     .xAxis().ticks(2)

//   // AFSC

//   d3.select("#row3").append("div")
//     .attr("id", 'dc-shred-chart')
//     .append("h6")
//     .text("DAFSC Prefix")
//     .append("span")
//     .append("a")
//     .attr("class","reset")
//     .style("display", "none")
//     .attr("href", `javascript:row3Charts['shred'].chart.filterAll();dc.redrawAll();`)
//     .text(" reset")
    
//   row3Charts['shred'] = {
//     chart: dc.rowChart('#dc-shred-chart'),
//     dim: facts.dimension(d => d.dafsc_prefix)
//   }
//   row3Charts['shred']['group'] = {
//     all: ()=>row3Charts['shred'].dim.group().top(Infinity).filter(d => d.key != "")
//   }

//   row3Charts['shred'].chart.width(width/6)
//     .height(row3height)
//     .margins({top: 5, left: 10, right: 10, bottom: 20})
//     .dimension(row3Charts['shred'].dim)
//     .group(row3Charts['shred'].group)
//     .colors(d3.scale.category10())
//     .label(d => d.key)
//     .elasticX(true)
//     .xAxis().ticks(4)

//    d3.select("#row3").append("div")
//     .attr("id", 'dc-core-util-chart')
//     .append("h6")
//     .text("Core Util")
//     .append("span")
//     .append("a")
//     .attr("class","reset")
//     .style("display", "none")
//     .attr("href", `javascript:row3Charts['core_util'].chart.filterAll();dc.redrawAll();`)
//     .text(" reset")
    
//   row3Charts['core_util'] = {
//     chart: dc.rowChart('#dc-core-util-chart'),
//     dim: facts.dimension(d => d.core_utilization== '' ? 'Error' : d.core_utilization)
//   }

//   row3Charts['core_util'].chart.width(width/6)
//     .height(row3height)
//     .margins({top: 5, left: 10, right: 10, bottom: 20})
//     .dimension(row3Charts['core_util'].dim)
//     .group(row3Charts['core_util'].dim.group())
//     .colors(d3.scale.category10())
//     .label(d => d.key)
//     .elasticX(true)
//     .xAxis().ticks(4)


//   d3.select("#majcom").append("div")
//     .attr("id", 'dc-majcom-chart')
//     .append("h6")
//     .text("MAJCOM")
//     .append("span")
//     .append("a")
//     .attr("class","reset")
//     .style("display", "none")
//     .attr("href", `javascript:majcom.chart.filterAll();dc.redrawAll();`)
//     .text(" reset")

//   // Majcom
//   var majcomChart = dc.barChart("#dc-majcom-chart")
//   var majcomCount = _.countBy(data, d=>d.majcom)
//   data2=data
//   var majcom = facts.dimension(d => majcomCount[d.majcom] < 15 ? 'OTHER' : d.majcom)
//   majcomChart.width(width)
//     .height(300)
//     .margins({top: 10, right: 10, bottom: 60, left: 40})
//     .x(d3.scale.ordinal())
//     .xUnits(dc.units.ordinal)
//     .brushOn(false)
//     .dimension(majcom)
//     .group(majcom.group())
//     .elasticY(true)
//         .ordering(d => -d.value)
//   majcomChart.yAxis().tickFormat(d3.format("d")).ticks(5)

//   d3.select("#location").append("div")
//     .attr("id", 'dc-location-chart')
//     .append("h6")
//     .text("Location")
//     .append("span")
//     .append("a")
//     .attr("class","reset")
//     .style("display", "none")
//     .attr("href", `javascript:location.chart.filterAll();dc.redrawAll();`)
//     .text(" reset")

//   // Location. Location 2 includes other, which is small bases aggregated 
//   var locationChart = dc.barChart("#dc-location-chart")
//   var locationCount = _.countBy(data, d => d.UNIT_DERIVED.includes('AFROTC') ? 'AFROTC' : d.location)
//   var location = facts.dimension(d => d.UNIT_DERIVED.includes('AFROTC') ? 'AFROTC' : locationCount[d.location] < 5 ? 'Other' : d.location)
//   locationChart.width(width)
//     .height(300)
//     .margins({top: 10, right: 10, bottom: 100, left: 40})
//     .x(d3.scale.ordinal())
//     .xUnits(dc.units.ordinal)
//     .brushOn(false)
//     .dimension(location)
//     .group(location.group())
//     .elasticY(true)
//   locationChart.yAxis().tickFormat(d3.format("d")).ticks(5)

//   var headers = [{name: 'Name',var_name: 'name', width: 250},
//   {name: 'Grade',var_name: 'grade', width: 50},
//   {name: 'DAFSC', var_name: 'dafsc', width: 80},
//   {name: 'Location', var_name: 'location', width: 150},
//   {name: 'Pascode', var_name: 'pascode', width: 80},
//   {name: 'Unit', var_name: 'UNIT_DERIVED', width: 300},
//   {name: 'Title', var_name: 'duty_title', width: 300}]

//     // export button
//   d3.select("#table")
//     .insert("a")
//     .attr("id", "export")
//     .attr("href", "#")
//     .attr("class", "btn btn-success")
//     .text("Export")
//     .style("cursor", "pointer")
//     .style("float", "right")

//   var table = d3.select("#table")
//     .append("table")
//     .attr("id", "dc-data-table")
//     .attr("class", "table table-hover")
//     .style("background", "#eee")
//     .style("table-layout", "fixed")
//     .style("text-align", "left")
//     .append("thead")
//     .append("tr")
//     .attr("class", "header")
//     .style("padding", "0px")
//     .style("background-color", "#ddd")
//     .style("color", "#333")

//   var table_sortvar = ''
//   table.selectAll("th")
//     .data(headers).enter()
//     .append("th")
//     .attr("class", (d, i) => '_'+i+' th_'+d.name)
//     .text(d => d.name)
//     .style("float", "left")
//     .style("line-height", "1em")
//     .style("border", "0px")
//     .style("padding", "5px")
//     .style("font-weight", "normal")
//     .style("cursor", "pointer")
//     .on("click", v=>{
//       dataTable.sortBy(d=>d[v.var_name])
//       if (table_sortvar == v.var_name){
//         dataTable.order(d3.descending)
//       } else {
//         table_sortvar = v.var_name
//         dataTable.order(d3.ascending)
//       }
//       dataTable.render()
//     })

//   dataTable = dc.dataTable("#dc-data-table")
//   tableDim = facts.dimension(d => d.name)
//   dataTable.width(width)
//     .dimension(tableDim)
//     .group(d => 'Showing only first 500 selections')
//     // .showGroups(false)
//     .size(500)
//     // Return an array of function that returns each variable name
//     .columns(headers.map(d => (v)=>v[d.var_name]))
//     .sortBy(d => d.name)
//     .order(d3.ascending)
//     .on('postRender', setTableStyle)
//     .on('postRedraw', setTableStyle)

//     // Table styling 
//     function setTableStyle(){
//       d3.selectAll("#dc-data-table tbody")
//       .style("display", "block")
//       .style("height", "500px")
//       .style("overflow-y", "auto")
//       .style("overflow-x", "hidden")
//       headers.forEach((d, i)=>{
//         d3.selectAll("._"+i)
//           .style("width", headers[i].width+"px")
//       })
//       d3.selectAll("#dc-data-table td")
//       .style("cursor", "pointer")
//       .style("color", "#333")
//       .style("font-size", "13px")
//       .style("border", "0px")
//       .style("float", "left")
//       .style("line-height", "1em")
//       .style("border", "0px")
//       .style("padding", "5px")
//     }


//     d3.selectAll("#export")
//       .on("click", exportAll)
//     function exportAll() {
//       // prepare CSV data
//       var csvData = new Array();
//       csvData.push('"'+headers.map(d=>d.name).join('","')+'"');
//       var outData = tableDim.top(Infinity).sort((a,b)=>a.name>b.name)
//       outData.forEach(officer => {
//         var outString = '"'
//         headers.map(d=>d.var_name).forEach(variable => {
//           outString += officer[variable].trim() + '","'
//         })
//         csvData.push(outString.slice(0,outString.length-2))
//       })
//       var fileName = "export.csv";
//       var buffer = csvData.join("\n");
//       var blob = new Blob([buffer], {"type": "text/csv;charset=utf8;"})
//       link = document.getElementById("export");
//       if (link.download !== undefined) { // feature detection
//         // Browsers that support HTML5 download attribute
//         link.setAttribute("href", window.URL.createObjectURL(blob));
//         link.setAttribute("download", fileName);
//       } else {
//         link.setAttribute("href", "http://www.example.com/export");
//       }
//     }

  
  // Render the Charts
  dc.renderAll()
})
})

