quorra.pie = function() {
    /**
    quorra.pie()

    Pie chart. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3887235
    
    @author <bprinty@gmail.com>
    */

    // attributes
    var radius = "auto";
    var inner = "auto";
    var width = "auto";
    var height = "auto";
    var margin = {"top": 20, "bottom": 20, "left": 20, "right": 20};
    var color = d3.scale.category10();
    var x = function(d, i) { return d.x; };
    var group = function(d, i){ return (typeof d.group == "undefined") ? i : d.group; };
    var label = function(d, i){ return (typeof d.label == "undefined") ? i : d.label[0]; };
    var aggregate = function(x){ return(x[0]); }
    var legend = true;
    var tooltip = d3.select("body").append("div")
            .attr("id", "pie-tooltip")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("opacity", 0);

    // generator
    function go(selection){
        // format selection
        if (typeof selection == "string") selection = d3.select(selection);

        // if height/width are auto, determine them from selection
        var w = (width == "auto") ? (parseInt(selection.style("width")) - margin.left - margin.right) : width;
        var h = (height == "auto") ? (parseInt(selection.style("height")) - margin.top - margin.bottom) : height;
        var r = (radius == "auto") ? (Math.max(w, h)) : radius;
        var ir = (inner == "auto") ? 0 : inner;

        // aggregate data
        var data = selection.data()[0];
        var newdata = [];
        var gps = _.unique(_.map(data, function(d){ return( d.group ); }));
        for (var i in gps){
            var subdat = _.filter(data, function(d){ return d.group == gps[i]; });
            newdata.push({
                x: aggregate(_.map(subdat, function(d){ return d.x; })),
                group: gps[i],
                label: _.map(subdat, function(d){ return d.label; })
            });
        }

        // initialize canvas
        var arc = d3.svg.arc()
            .outerRadius(r)
            .innerRadius(ir);

        var pie = d3.layout.pie()
            .sort(null)
            .value(function(d){ return d.x; });

        var svg;
        if (selection.select("svg")[0][0] == null){
            svg = selection.append("svg");
        } else {
            svg = selection.select("svg");
        }
        svg = svg.attr("class", "quorra-pie")
            .attr("width", w + margin.left + margin.right)
            .attr("height", h + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + (w + margin.left + margin.right) / 2 + "," + (h + margin.top + margin.bottom) / 2 + ")");

        // plot
        var g = svg.selectAll(".arc")
            .data(pie(newdata))
            .enter().append("g")
            .attr("class", "arc");

        g.append("path")
            .attr("d", arc)
            .style("fill", function(d, i) { return color(group(d, i)); })
            .style("opacity", 0.75)
            .on("mouseover", function(d, i){
                d3.select(this).style("opacity", 0.25);
                if (tooltip == false) { return 0; }
                tooltip.html(label(d.data, i))
                    .style("opacity", 1)
                    .style("left", (d3.event.pageX + 5) + "px")
                    .style("top", (d3.event.pageY - 20) + "px");
            }).on("mousemove", function(d){
                if (tooltip == false) { return 0; }
                tooltip
                    .style("left", (d3.event.pageX + 5) + "px")
                    .style("top", (d3.event.pageY - 20) + "px");
            }).on("mouseout", function(d){
                d3.select(this).style("opacity", 0.75);
                if (tooltip == false) { return 0; }
                tooltip.style("opacity", 0);
            });

        // legend (if specified)
        if (legend) {
            g.append("text")
                .attr("class", "axis")
                .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
                .attr("dy", ".35em")
                .style("text-anchor", "middle")
                .text(function(d) { return label(d.data, i); });
        }
    }

    // getters/setters
    go.width = function(value) {
        if (!arguments.length) return width;
        width = value;
        return go;
    };
    go.height = function(value) {
        if (!arguments.length) return height;
        height = value;
        return go;
    };
    go.radius = function(value) {
        if (!arguments.length) return radius;
        radius = value;
        return go;
    };
    go.inner = function(value) {
        if (!arguments.length) return inner;
        inner = value;
        return go;
    };
    go.margin = function(value) {
        if (!arguments.length) return margin;
        margin = value;
        return go;
    };
    go.color = function(value) {
        if (!arguments.length) return color;
        color = value;
        return go;
    };
    go.x = function(value) {
        if (!arguments.length) return x;
        x = value;
        return go;
    };
    go.group = function(value) {
        if (!arguments.length) return group;
        group = value;
        return go;
    };
    go.label = function(value) {
        if (!arguments.length) return label;
        label = value;
        return go;
    };
    go.aggregate = function(value) {
        if (!arguments.length) return aggregate;
        aggregate = value;
        return go;
    };
    go.legend = function(value) {
        if (!arguments.length) return legend;
        legend = value;
        return go;
    };
    go.tooltip = function(value) {
        if (!arguments.length) return tooltip;
        tooltip.remove();
        tooltip = value;
        return go;
    };

    return go;
};