quorra.histogram = function(attributes) {
    /**
    quorra.histogram()

    Histogram. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3883245

    @author <bprinty@gmail.com>
    */

    // tooltip
    var tooltip = d3.select("body").append("div")
        .attr("id", "histogram-tooltip")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("opacity", 0);

    // generator
    var go = quorra.bar({
            bins: 10,
            display: 'counts'  // fraction, percent, counts
        })
        .id('histogram')
        .tooltip(tooltip)
        .transform(function(data){
        
            // formatters
            var format;
            if (go.display() == "percent") {
                format = d3.format("0.02%");
            } else if (go.display() == "counts") {
                format = d3.format(".0f");
            } else if (go.display() == "fraction"){
                format = d3.format(".02f");
            }
            if (go.yformat() === "auto"){
                go.yformat(format);
            }
            var xScale = d3.scale.linear().range([0, go.innerWidth]);

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
                    } else if (go.display() == 'percent'){
                        d.y = d.y;
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

    return go;
};