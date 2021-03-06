/**
 * Created by wallace on 10/06/2016.
 */
(function () {
  'use strict';

  // var d3 = require('d3');

  angular.module('gentelellaAngularApp')
    .config(stateConfig)
    .controller('initController', initController);

  function stateConfig($stateProvider) {
    $stateProvider.state('init', {
      templateUrl: 'views/init/init.html',
      controller: 'initController',
      controllerAs: 'vm',
      data: {
      }
    });
  }

  function initController($timeout) {
    var vm = this;

    vm.totalPredictions = 1337;
    vm.totalGreenLight = 1333;
    vm.totalMaintenance = 4;

    liveData();



    function liveData() {
      $timeout(function () {
        if (vm.totalPredictions % 500 == 0) {
          vm.totalMaintenance++;
        } else {
          vm.totalGreenLight++;
        }

        vm.totalPredictions++;


        liveData();
      }, 2);
    }


    d3.csv("population.csv", function (err, data) {
      var config = {
        "data0": "Country (or dependent territory)", "data1": "Population",
        "label0": "label 0", "label1": "label 1", "color0": "#99ccff", "color1": "#0050A1",
        "width": $('#worldmap').width(), "height": $('#worldmap').width()
      }

      var width = config.width,
        height = config.height;

      var COLOR_COUNTS = 9;

      function Interpolate(start, end, steps, count) {
        var s = start,
          e = end,
          final = s + (((e - s) / steps) * count);
        return Math.floor(final);
      }

      function Color(_r, _g, _b) {
        var r, g, b;
        var setColors = function (_r, _g, _b) {
          r = _r;
          g = _g;
          b = _b;
        };

        setColors(_r, _g, _b);
        this.getColors = function () {
          var colors = {
            r: r,
            g: g,
            b: b
          };
          return colors;
        };
      }

      function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : null;
      }

      function valueFormat(d) {
        if (d > 1000000000) {
          return Math.round(d / 1000000000 * 10) / 10 + "B";
        } else if (d > 1000000) {
          return Math.round(d / 1000000 * 10) / 10 + "M";
        } else if (d > 1000) {
          return Math.round(d / 1000 * 10) / 10 + "K";
        } else {
          return d;
        }
      }

      var COLOR_FIRST = config.color0, COLOR_LAST = config.color1;

      var rgb = hexToRgb(COLOR_FIRST);

      var COLOR_START = new Color(rgb.r, rgb.g, rgb.b);

      rgb = hexToRgb(COLOR_LAST);
      var COLOR_END = new Color(rgb.r, rgb.g, rgb.b);

      var startColors = COLOR_START.getColors(),
        endColors = COLOR_END.getColors();

      var colors = [];

      for (var i = 0; i < COLOR_COUNTS; i++) {
        var r = Interpolate(startColors.r, endColors.r, COLOR_COUNTS, i);
        var g = Interpolate(startColors.g, endColors.g, COLOR_COUNTS, i);
        var b = Interpolate(startColors.b, endColors.b, COLOR_COUNTS, i);
        colors.push(new Color(r, g, b));
      }

      var MAP_KEY = config.data0;
      var MAP_VALUE = config.data1;

      var projection = d3.geo.mercator()
        .scale((width + 1) / 2 / Math.PI)
        .translate([width / 2, height / 2])
        .precision(.1);

      var path = d3.geo.path()
        .projection(projection);

      var graticule = d3.geo.graticule();

      var svg = d3.select("#canvas-svg").append("svg")
        .attr("width", width)
        .attr("height", height);

      svg.append("path")
        .datum(graticule)
        .attr("class", "graticule")
        .attr("d", path);

      var valueHash = {};

      function log10(val) {
        return Math.log(val);
      }

      data.forEach(function (d) {
        valueHash[d[MAP_KEY]] = +d[MAP_VALUE];
      });

      var quantize = d3.scale.quantize()
        .domain([0, 1.0])
        .range(d3.range(COLOR_COUNTS).map(function (i) { return i }));

      quantize.domain([d3.min(data, function (d) {
        return (+d[MAP_VALUE])
      }),
      d3.max(data, function (d) {
        return (+d[MAP_VALUE])
      })]);

      d3.json("https://s3-us-west-2.amazonaws.com/vida-public/geo/world-topo-min.json", function (error, world) {
        var countries = topojson.feature(world, world.objects.countries).features;

        svg.append("path")
          .datum(graticule)
          .attr("class", "choropleth")
          .attr("d", path);

        var g = svg.append("g");

        g.append("path")
          .datum({ type: "LineString", coordinates: [[-180, 0], [-90, 0], [0, 0], [90, 0], [180, 0]] })
          .attr("class", "equator")
          .attr("d", path);

        var country = g.selectAll(".country").data(countries);

        country.enter().insert("path")
          .attr("class", "country")
          .attr("d", path)
          .attr("id", function (d, i) { return d.id; })
          .attr("title", function (d) { return d.properties.name; })
          .style("fill", function (d) {
            if (valueHash[d.properties.name]) {
              var c = quantize((valueHash[d.properties.name]));
              var color = colors[c].getColors();
              return "rgb(" + color.r + "," + color.g +
                "," + color.b + ")";
            } else {
              return "#ccc";
            }
          })
          .on("mousemove", function (d) {
            var html = "";

            html += "<div class=\"tooltip_kv\">";
            html += "<span class=\"tooltip_key\">";
            html += d.properties.name;
            html += "</span>";
            html += "<span class=\"tooltip_value\">";
            html += (valueHash[d.properties.name] ? valueFormat(valueHash[d.properties.name]) : "");
            html += "";
            html += "</span>";
            html += "</div>";

            $("#tooltip-container").html(html);
            $(this).attr("fill-opacity", "0.8");
            $("#tooltip-container").show();

            var coordinates = d3.mouse(this);

            var map_width = $('.choropleth')[0].getBoundingClientRect().width;

            if (d3.event.pageX < map_width / 2) {
              d3.select("#tooltip-container")
                .style("top", (d3.event.layerY + 15) + "px")
                .style("left", (d3.event.layerX + 15) + "px");
            } else {
              var tooltip_width = $("#tooltip-container").width();
              d3.select("#tooltip-container")
                .style("top", (d3.event.layerY + 15) + "px")
                .style("left", (d3.event.layerX - tooltip_width - 30) + "px");
            }
          })
          .on("mouseout", function () {
            $(this).attr("fill-opacity", "1.0");
            $("#tooltip-container").hide();
          });

        g.append("path")
          .datum(topojson.mesh(world, world.objects.countries, function (a, b) { return a !== b; }))
          .attr("class", "boundary")
          .attr("d", path);

        svg.attr("height", config.height * 2.2 / 3);
      });

      d3.select(self.frameElement).style("height", (height * 2.3 / 3) + "px");
    });







    var margin = {top: 20, right: 20, bottom: 30, left: 40},
    width = $('#worldmap').width() - margin.left - margin.right,
    height = width - margin.top - margin.bottom;

var formatPercent = d3.format(".0%");

var x = d3.scale.ordinal()
    .rangeRoundBands([0, width], .1, 1);

var y = d3.scale.linear()
    .range([height, 0]);

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .tickFormat(formatPercent);



var svg = d3.select("#bar-svg").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

d3.tsv("data.tsv", function(error, data) {

  data.forEach(function(d) {
    d.frequency = +d.frequency;
  });

  x.domain(data.map(function(d) { return d.letter; }));
  y.domain([0, d3.max(data, function(d) { return d.frequency; })]);

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Frequency");

  svg.selectAll(".bar")
      .data(data)
    .enter().append("rect")
      .attr("class", "bar")
      .attr("x", function(d) { return x(d.letter); })
      .attr("width", x.rangeBand())
      .attr("y", function(d) { return y(d.frequency); })
      .attr("height", function(d) { return height - y(d.frequency); });

  d3.select("input").on("change", change);

  var sortTimeout = setTimeout(function() {
    d3.select("input").property("checked", true).each(change);
  }, 10000);

  function change() {
    clearTimeout(sortTimeout);

    // Copy-on-write since tweens are evaluated after a delay.
    var x0 = x.domain(data.sort(this.checked
        ? function(a, b) { return b.frequency - a.frequency; }
        : function(a, b) { return d3.ascending(a.letter, b.letter); })
        .map(function(d) { return d.letter; }))
        .copy();

    svg.selectAll(".bar")
        .sort(function(a, b) { return x0(a.letter) - x0(b.letter); });

    var transition = svg.transition().duration(750),
        delay = function(d, i) { return i * 50; };

    transition.selectAll(".bar")
        .delay(delay)
        .attr("x", function(d) { return x0(d.letter); });

    transition.select(".x.axis")
        .call(xAxis)
      .selectAll("g")
        .delay(delay);
  }
});



  }

})();
