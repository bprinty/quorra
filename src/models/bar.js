quorra.bar = function(attributes) {
    /**
    quorra.bar()

    Bar plot. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3943967

    @author <bprinty@gmail.com>
    */

    // attributes
    var attr = attributeConstructor('bar');
    attr.layout = "stacked";
    attr = _.extend(attr, attributes);

    // generator
    function go(selection){
        // format selection
        if (typeof selection === 'string') selection = d3.select(selection);

        // transform data (if transformation function is applied)
        // this is used for histogram plots
        var newdata = attr.transform(selection.data()[0]);

        // canvas
        var svg = initializeCanvas(selection, attr);

        // determine inner dimensions for plot
        var dim = parameterizeInnerDimensions(selection, attr);

        // configure axes
        var axes = parameterizeAxes(selection, newdata, attr, dim.innerWidth, dim.innerHeight);

        // axes
        drawAxes(svg, attr, axes.xAxis, axes.yAxis, dim.innerWidth, dim.innerHeight);
        
        // coloring
        var color = parameterizeColorPallete(newdata, attr);

        // construct legend
        var legend = legendConstructor(svg, attr, dim.innerWidth, dim.innerHeight, color);

        // organizing data
        // no interpolation should happen here because 
        // users should be responsible for ensuring that their data
        // is complete
        var layers = [];
        var ugrps = _.unique(_.map(newdata, function(d){ return d.group; }));
        for (var grp in ugrps) {
            var flt = _.filter(newdata, function(d){ return d.group == ugrps[grp]; });
            flt = _.map(flt, function(d){
                d.layer = grp;
                return d;
            });
            layers.push(_.filter(flt, function(d){ return d.group == ugrps[grp]; }));
        }
        var y0 = _.map(layers[0], function(d){ return 0; });
        for (var lay=0; lay<layers.length; lay++){
            layers[lay] = _.map(layers[lay], function(d, i){ 
                d.y0 = y0[i];
                y0[i] = y0[i] + d.y;
                return d;
            });  
        }

        // plotting bars
        var layer = svg.selectAll(".layer")
            .data(layers)
            .enter().append("g")
            .attr("class","layer");
        
        var rect = layer.selectAll("rect")
            .data(function(d){ return d; })
            .enter().append("rect")
            .attr("class", function(d, i){
                return "bar " + "g_" + d.group;
            })
            .attr("x", function(d, i){
                if (attr.layout == "stacked"){
                    return axes.xScale(attr.x(d, i));    
                }else{
                    return axes.xScale(attr.x(d, i)) + color.range().indexOf(color(d.group))*dim.innerWidth/newdata.length;
                }
            })
            // NOTE: this needs to be fixed so that y0 is 
            // parameterized before this takes place.
            .attr("y", function(d, i){ return (attr.layout == "stacked") ? axes.yScale(d.y0 + d.y) : axes.yScale(d.y); })
            .attr("height", function(d, i){ return (attr.layout == "stacked") ? (axes.yScale(d.y0) - axes.yScale(d.y0 + d.y)) : (dim.innerHeight - axes.yScale(d.y)); })
            .attr("width", function(){
                if (attr.layout == "stacked"){
                    var xlim = _.max(_.map(layers, function(d){ return d.length; }));
                    return (dim.innerWidth-xlim)/xlim;
                }else{
                    return (dim.innerWidth-newdata.length)/newdata.length;
                }
            }).attr("fill", function(d, i){ return color(d.group); })
            .style("opacity", 0.75)
            .on("mouseover", function(d, i){
                d3.select(this).style("opacity", 0.25);
                attr.tooltip.html(d.label)
                    .style("opacity", 1)
                    .style("left", (d3.event.pageX + 5) + "px")
                    .style("top", (d3.event.pageY - 20) + "px");
            }).on("mousemove", function(d){
                attr.tooltip
                    .style("left", (d3.event.pageX + 5) + "px")
                    .style("top", (d3.event.pageY - 20) + "px");
            }).on("mouseout", function(d){
                d3.select(this).style("opacity", 0.75);
                attr.tooltip.style("opacity", 0);
            });

        // expose editable attributes (user control)
        go.svg = svg;
        go.legend = legend;
        go.xScale = axes.xScale;
        go.xAxis = axes.xAxis;
        go.xGroups = axes.xGroups;
        go.yScale = axes.yScale;
        go.yAxis = axes.yAxis;
        go.yGroups = axes.yGroups;
        go.innerWidth = dim.innerWidth;
        go.innerHeight = dim.innerHeight;
    }

    // bind attributes to constructor
    bindConstructorAttributes(go, attr);

    return go;
};