queue()
    .defer(d3.json, "/data")
    .await(makeGraphs);

var dateFormat = d3.time.format("%Y-%m-%d %H:%M:%S");


function makeGraphs(error, recordsJson) {
	
	//Clean data
	var records = recordsJson;

	records.forEach(function(d) {
		d["timestamp"] = dateFormat.parse(d["timestamp"]);
		d["timestamp"].setMinutes(0);
		d["timestamp"].setSeconds(0);
		d["longitude"] = d["longitude"];
		d["latitude"] = d["latitude"];
	});

	//Create a Crossfilter instance
	var ndx = crossfilter(records);

	//Define Dimensions
	var dateDim = ndx.dimension(function(d) { return d["timestamp"]; });
	var pain_typeDim = ndx.dimension(function(d) { return d["pain_type"]; });
	var pain_areaDim = ndx.dimension(function(d) { return d["pain_area"]; });
    var pain_scoreDim = ndx.dimension(function(d) { return Math.floor(d["pain_score"]); });
	var allDim = ndx.dimension(function(d) {return d;});


	//Group Data
	var numRecordsByDate = dateDim.group();
	var numRecordsByType = pain_typeDim.group();
    var numRecordsByArea = pain_areaDim.group();
    var numRecordsByScore = pain_scoreDim.group();
	var locationGroup = locationdDim.group();
	var all = ndx.groupAll();


	//Define values (to be used in charts)
	var minDate = dateDim.bottom(1)[0]["timestamp"];
	var maxDate = dateDim.top(1)[0]["timestamp"];


    //Charts
    var numberRecordsND = dc.numberDisplay("#number-records-nd");
	var paintimeChart = dc.barChart("#pain-time-chart");
	var locationChart = dc.rowChart("#location-row-chart");



	numberRecordsND
		.formatNumber(d3.format("d"))
		.valueAccessor(function(d){return d; })
		.group(all);


	paintimeChart
		.width(650)
		.height(140)
		.margins({top: 10, right: 50, bottom: 20, left: 20})
		.dimension(dateDim)
		.group(numRecordsByDate)
		.transitionDuration(500)
		.x(d3.time.scale().domain([minDate, maxDate]))
		.elasticY(true)
		.yAxis().ticks(4);

    locationChart
    	.width(200)
		.height(510)
        .dimension(locationdDim)
        .group(locationGroup)
        .ordering(function(d) { return -d.value })
        .colors(['#6baed6'])
        .elasticX(true)
        .labelOffsetY(10)
        .xAxis().ticks(4);

    var map = L.map('map');

	var drawMap = function(){

	    map.setView([31.75, 110], 4);
		mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';
		L.tileLayer(
			'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; ' + mapLink + ' Contributors',
				maxZoom: 15,
			}).addTo(map);

		//HeatMap
		var geoData = [];
		_.each(allDim.top(Infinity), function (d) {
			geoData.push([d["latitude"], d["longitude"], 1]);
	      });
		var heat = L.heatLayer(geoData,{
			radius: 10,
			blur: 20, 
			maxZoom: 1,
		}).addTo(map);

	};

	//Draw Map
	drawMap();

	//Update the heatmap if any dc chart get filtered
	dcCharts = [timeChart, genderChart, ageSegmentChart, phoneBrandChart, locationChart];

	_.each(dcCharts, function (dcChart) {
		dcChart.on("filtered", function (chart, filter) {
			map.eachLayer(function (layer) {
				map.removeLayer(layer)
			}); 
			drawMap();
		});
	});

	dc.renderAll();

};