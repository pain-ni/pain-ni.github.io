'use strict'


var dateFormat = d3.time.format("%Y-%m-%d %H:%M:%S");


var dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
];


function average_map(m) {
    var sum = 0;
    m.forEach(function (k, v) {
        sum += v;
    });
    return m.size() ? sum / m.size() : 0;
}

function makeUserGraphs(error, recordsJson, markersGeoJson) {

    //Clean data
    var records = recordsJson;

    records.forEach(function(d) {
        d["log_time"] = dateFormat.parse(d["log_time"]);
        d["pain_type"] = d["type"]["name"];
    });

    //Create a Crossfilter instance
    var ndx = crossfilter(records);

    //Define Dimensions
    var dateDim = ndx.dimension(function(d) { return d["log_time"]; });
    var pain_typeDim = ndx.dimension(function(d) { return d["type"]["name"]; });
    var pain_areaDim = ndx.dimension(function(d) { return d["area"]; });
    var pain_scoreDim = ndx.dimension(function(d) { return Math.floor(d["score"]); });
    var dayDim = ndx.dimension(function (d) {
        return dayNames[d["log_time"].getDay()];
    });
    var hourDim = ndx.dimension(function (d) {
        return d["log_time"].getHours();
    });
    var allDim = ndx.dimension(function(d) {return d;});


    //Group Data
    var numRecordsByDate = dateDim.group();
    var numRecordsByType = pain_typeDim.group();
    var numRecordsByArea = pain_areaDim.group();
    var numRecordsByScore = pain_scoreDim.group();
    var all = ndx.groupAll();

    var painTimeG = dateDim.group().reduceSum(function (d) {
        return d.score;
    });


    var pain_scorePerDay = dayDim.group().reduce(
        function (p, v) { // add
            var log_time = d3.time.day(v.log_time).getTime();
            p.map.set(log_time, p.map.has(log_time) ? p.map.get(log_time) + v['score'] : v['score']);
            p.avg = average_map(p.map);
            return p;
        },
        function (p, v) { // remove
            var log_time = d3.time.day(v.log_time).getTime();
            p.map.set(log_time, p.map.has(log_time) ? p.map.get(log_time) - v['score'] : 0);
            p.avg = average_map(p.map);
            return p;
        },
        function () { // init
            return {map: d3.map(), avg: 0};
        }
    );
    var pain_scorePerHour = hourDim.group().reduce(
        function (p, v) { // add
            var log_time = d3.time.day(v.log_time).getTime();
            p.map.set(log_time, p.map.has(log_time) ? p.map.get(log_time) + v['score'] : v['score']);
            p.avg = average_map(p.map);
            return p;
        },
        function (p, v) { // remove
            var log_time = d3.time.day(v.log_time).getTime();
            p.map.set(log_time, p.map.has(log_time) ? p.map.get(log_time) - v['score'] : 0);
            p.avg = average_map(p.map);
            return p;
        },
        function () { // init
            return {map: d3.map(), avg: 0};
        }
    );

    //Define values (to be used in charts)
    var minDate = dateDim.bottom(1)[0]["log_time"];
    var maxDate = dateDim.top(1)[0]["log_time"];


    //Charts
    var numberRecordsND = dc.numberDisplay("#number-records-nd");
    var paintimeChart = dc.lineChart("#pain-time-chart");
    var dailyPainChart = dc.rowChart("#daily-pain-chart");
    var hourlyPainChart = dc.lineChart("#hourly-pain-chart");
    var painTypePie = dc.pieChart("#pain-type-pie");
    var painAreaPie = dc.pieChart("#pain-area-pie");
    //Update the heatmap if any dc chart get filtered
    var dcCharts = [paintimeChart, dailyPainChart, hourlyPainChart, painTypePie];


    numberRecordsND
        .formatNumber(d3.format("d"))
        .valueAccessor(function(d){return d; })
        .group(all);


    paintimeChart
        .width(960)
        .height(140)
        .margins({top: 10, right: 50, bottom: 20, left: 20})
        .dimension(dateDim)
        .group(painTimeG)
        .transitionDuration(500)
        .x(d3.time.scale().domain([minDate, maxDate]))
        .elasticY(true)
        .yAxis().ticks(4);

    dailyPainChart
        .width(430)
        .height(250)
        .transitionDuration(500)
        .dimension(dayDim)
        .group(pain_scorePerDay)
        .margins({top: 10, right: 50, bottom: 40, left: 30}) // Add padding to bottom for axis label
        .valueAccessor(function (d) {
            return d.value.avg;
        })
        .colors(d3.scale.category10())
        .label(function (d) {
            return d.key;
        })
        .title(function (d) {
            return d.key + ' / ' + d.value.avg;
        })
        .elasticX(true)
        .ordering(function (d) {
            return (dayNames.indexOf(d.key)+6)%7;
        })
        .xAxis().ticks(4);

    hourlyPainChart
        .width(430)
        .height(250)
        .transitionDuration(500)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .dimension(hourDim)
        .group(pain_scorePerHour)
        .valueAccessor(function (d) {
            return d.value.avg;
        })
        .colors(d3.scale.category10())
        .label(function (d) {
            return d.key;
        })
        .title(function (d) {
            console.log(d);
            return d.key + ' / ' + d.value.avg;
        })
        .elasticX(true)
        .xAxisLabel("Hour")
        .yAxisLabel("Average Pain Level")
        .xAxis().ticks(4);

    painAreaPie
        .width(250)
        .height(250)
        //.slicesCap(4)
        .innerRadius(30)
        .dimension(allDim)
        .group(numRecordsByArea)
        .legend(dc.legend())
        // workaround for #703: not enough data is accessible through .label() to display percentages
        .on('pretransition', function(chart) {
            chart.selectAll('text.pie-slice').text(function(d) {
                return d.data.key + ' ' + dc.utils.printSingleValue((d.endAngle - d.startAngle) / (2*Math.PI) * 100) + '%';
            })
        });

    painTypePie
        .width(250)
        .height(250)
        //.slicesCap(4)
        .innerRadius(30)
        .dimension(allDim)
        .group(numRecordsByType)
        .legend(dc.legend())
        // workaround for #703: not enough data is accessible through .label() to display percentages
        .on('pretransition', function(chart) {
            chart.selectAll('text.pie-slice').text(function(d) {
                return d.data.key + ' ' + dc.utils.printSingleValue((d.endAngle - d.startAngle) / (2*Math.PI) * 100) + '%';
            })
        });
    var map = L.map('map');

    var hospitalicon = L.icon({
    iconUrl: '/assets/img/hospital.png',

    iconSize:     [8, 8], // size of the icon
    iconAnchor:   [4,4], // point of the icon which will correspond to marker's location
    popupAnchor:  [-3, -76] // point from which the popup should open relative to the iconAnchor
});

    var drawMap = function(){

        map.setView([54.58812897, -6.39210723] , 7);
        var mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';
        L.tileLayer(
            'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; ' + mapLink + ' Contributors',
                maxZoom: 15,
            }).addTo(map);

        //HeatMap
        var geoData = [];
        _.each(allDim.top(Infinity), function (d) {
            geoData.push([d["location"]["latitude"], d["location"]["longitude"], d['score']]);
        });
        var heat = L.heatLayer(geoData,{
            radius: 10,
            blur: 20,
            maxZoom: 1,
        }).addTo(map);
        L.geoJson(markersGeoJson, {
            pointToLayer: function(feature, latlng) {
                return L.marker(latlng, {icon: hospitalicon});
            },
           onEachFeature: function (feature, layer) {
                   layer.bindPopup(feature.properties.ATT1 + '<br />'
                                                 + feature.properties.ATT2);
           }
         }).addTo(map);

    };

    //Draw Map
    drawMap();

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
queue()
    .defer(d3.json, "/pain_random.json")
    .defer(d3.json, "/hospitals.geojson")
    .await(makeUserGraphs);