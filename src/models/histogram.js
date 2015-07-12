quorra.histogram = function() {
    /**
    quorra.histogram()

    Histogram. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3883245

    @author <bprinty@gmail.com>
    */

    // attributes
    var bins = 10;
    var display = 'counts'; // fraction, percent, counts
    var tooltip = d3.select("body").append("div")
        .attr("id", "histogram-tooltip")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("opacity", 0);

    // generator
    var go = quorra.bar()
        .tooltip(tooltip)
        .transform(function(data){
        
        // formatters
        var format = d3.format(".04f");
        var xScale = d3.scale.linear().range([0, go.w]);

        // generate histogram binning
        var histogram = d3.layout.histogram()
            .frequency(false)
            .bins(xScale.ticks(go.bins()));

        // rearranging data
        var grps = _.unique(_.map(data, function(d){ return d.group; }));
        var newdata = [];
        for (var grp in grps){
            var subdat = _.filter(data, function(d){ return d.group == grps[grp]; });
            var newgrp = histogram(_.map(subdat, function(d){ return d.x }));
            newgrp = _.map(newgrp, function(d){
                if (go.display() == 'counts'){
                    d.y = d.y*subdat.length;
                } else if (display == 'percent'){
                    d.y = d.y*100;
                }
                return {
                    x: d.x,
                    y: d.y,
                    group: grps[grp],
                    label: format(d.y)
                };
            });
            newdata = newdata.concat(newgrp);
        }

        return newdata;
    });

    // config display
    if (display == "percent") {
        go = go.yformat(d3.format("%"));
    } else if (display == "counts") {
        go = go.yformat(d3.format(".0f"));
    } else if (display == "fraction"){
        go = go.yformat(d3.format(".02f"));
    }

    // getters/setters
    go.bins = function(value) {
        if (!arguments.length) return bins;
        bins = value;
        return go;
    };
    go.display = function(value) {
        if (!arguments.length) return display;
        display = value;
        return go;
    };

    return go;
};