quorra.pie = function(attributes) {
    /**
    quorra.pie()

    Pie chart. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3887235
    
    @author <bprinty@gmail.com>
    */

    // attributes
    var attr = attributeConstructor();
    attr.aggregate = function(x){ return(x[0]); }
    attr.radius = "auto";
    attr.inner = "auto";
    attr.margin = {"top": 0, "bottom": 0, "left": 0, "right": 0};
    attr.lmargin = {"top": 15, "bottom": 0, "left": 0, "right": 0};
    attr = _.extend(attr, attributes);


    // generator
    function go(selection){
        // format selection
        if (typeof selection == "string") selection = d3.select(selection);

        // if height/width are auto, determine them from selection
        var w = (attr.width == "auto") ? parseInt(selection.style("width")) : attr.width;
        var h = (attr.height == "auto") ? parseInt(selection.style("height")) : attr.height;
        w = w - attr.margin.left - attr.margin.right;
        h = h - attr.margin.top - attr.margin.bottom;
        

        var r = (attr.radius == "auto") ? (Math.min(w, h) / 2) : attr.radius;
        var ir = (attr.inner == "auto") ? 0 : attr.inner;

        // aggregate data
        var data = selection.data()[0];
        var newdata = [];
        var gps = _.unique(_.map(data, function(d){ return( d.group ); }));
        for (var i in gps){
            var subdat = _.filter(data, function(d){ return d.group == gps[i]; });
            newdata.push({
                x: attr.aggregate(_.map(subdat, function(d){ return d.x; })),
                group: gps[i],
                label: _.map(subdat, function(d){ return d.label; })
            });
        }

        // initialize canvas
        // THIS NEEDS TO BE REFACTORED TO START USING
        // THE initializeCanvas function
        var svg;
        if (selection.select("svg")[0][0] == null){
            svg = selection.append("svg");
        } else {
            svg = selection.select("svg");
        }
        svg = svg.attr("class", "quorra-pie")
            .attr("id", attr.id)
            .attr("width", w + attr.margin.left + attr.margin.right)
            .attr("height", h + attr.margin.top + attr.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + (attr.margin.left + w / 2) + "," + (attr.margin.top + h /2) + ")");

        // coloring
        var color = parameterizeColorPallete(newdata, attr);

        // bind attributes to controller
        quorra.controller[attr.id] = {
            x: attr.margin.left,
            y: attr.margin.top,
            left: attr.margin.left,
            top: attr.margin.top,
            width: w,
            height: h,
            xstack: [],
            ystack: [],
            xdrag: null,
            ydrag: null,
            svg: selection.select('svg'),
            attr: attr,
            zoom: true,
            pan: false,
            color: color
        }

        quorra.controller[attr.id].render = function(xrange, yrange){

            var arc = d3.svg.arc()
                .outerRadius(r)
                .innerRadius(ir);

            var pie = d3.layout.pie()
                .sort(null)
                .value(function(d){ return d.x; });

            // plot
            var g = svg.selectAll(".arc")
                .data(pie(newdata))
                .enter().append("g")
                .attr("class", function(d){
                    return "arc g_" + d.data.group;
                })
                .style("visibility", function(d){
                    return _.contains(attr.toggled, attr.group(d.data)) ? 'hidden' : 'visible';
                });

            g.append("path")
                .attr("d", arc)
                .style("fill", function(d, i) { return color(attr.group(d.data, i)); })
                .style("opacity", attr.opacity)
                .on("mouseover", function(d, i){
                    d3.select(this).style("opacity", 0.25);
                    if (attr.tooltip){
                        attr.tooltip.html(attr.label(d.data, i))
                            .style("opacity", 1)
                            .style("left", (d3.event.pageX + 5) + "px")
                            .style("top", (d3.event.pageY - 20) + "px");
                    }
                }).on("mousemove", function(d){
                    if (attr.tooltip){
                        attr.tooltip
                            .style("left", (d3.event.pageX + 5) + "px")
                            .style("top", (d3.event.pageY - 20) + "px");
                    }
                }).on("mouseout", function(d){
                    d3.select(this).style("opacity", attr.opacity);
                    if (attr.tooltip){
                        attr.tooltip.style("opacity", 0);
                    }
                }).on("click", attr.labelclick);
        }

        // render
        quorra.controller[attr.id].render(attr.xrange, attr.yrange);

        // enable components
        if (attr.legend){
            enableLegend(attr.id);
        }
    }


    // bind attributes to constructor
    bindConstructorAttributes(go, attr);

    return go;
};