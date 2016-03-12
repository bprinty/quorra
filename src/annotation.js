function Annotation(attributes) {
    /**
    Annotation()

    Object for managing plot rendering, and extending
    common functionality across all plot models.

    @author <bprinty@gmail.com>
    */

    quorra.log('instantiating annotation object');

    if (typeof attributes == 'undefined') attributes = {};
    if (typeof plot == 'undefined') plot = 'body';
    var _this = this;

    // constructor
    this.go = function() {
        quorra.log('running annotation generator function');

        // create wrapper element for annotation groups
        _this.plot.plotarea.selectAll('.annotation#' + _this.attr.id).remove();
        var cl = (_this.attr.group == null) ? 'annotation ' + _this.attr.type : 'annotation ' + _this.attr.type + ' g_' + _this.attr.group;
        var asel = _this.plot.plotarea.append('g')
            .attr('id', _this.attr.id).attr('class', cl)
            .attr("clip-path", "url(#clip)")
            .style("visibility", function() {
                return _.contains(_this.plot.attr.toggled, _this.plot.attr.group(_this.attr)) ? 'hidden' : 'visible';
            }).on('mouseover', function() {
                d3.select(this).style('opacity', 0.75*_this.attr.style.opacity);
                if (_this.attr.tooltip) {
                    _this.attr.tooltip.html(_this.attr.hovertext)
                        .style("opacity", 1)
                        .style("left", (d3.event.pageX + 5) + "px")
                        .style("top", (d3.event.pageY - 20) + "px");
                }
            }).on('mousemove', function() {
                if (_this.attr.tooltip) {
                    _this.attr.tooltip
                        .style("left", (d3.event.pageX + 5) + "px")
                        .style("top", (d3.event.pageY - 20) + "px");
                }
            }).on('mouseout', function() {
                d3.select(this).style('opacity', _this.attr.style.opacity);
                if (_this.attr.tooltip) {
                    _this.attr.tooltip.style("opacity", 0);
                }
            }).on('click', _this.attr.events.click);
        
        // enable drag behavior for annotation (if available and specified)
        var x = _this.plot.xscale(_this.attr.x);
        var y = _this.plot.yscale(_this.attr.y);
        if (_this.attr.draggable && !_this.plot.attr.zoomable) {
            var drag = d3.behavior.drag()
                .on("dragstart", function() {
                    _this.attr.events.dragstart();
                }).on("dragend", function() {
                     _this.attr.events.dragend();
                }).on("drag", function() {
                    // get mouse coordinates
                    var movement = mouse(_this.plot.attr.svg);
                    xcoord = movement.x - x - _this.plot.attr.margin.left;
                    ycoord = movement.y - y - _this.plot.attr.margin.top;

                    // translate annotation object
                    d3.select(this).attr('transform', 'translate(' + xcoord + ',' + ycoord + ')');
                    
                    // update annotation attributes with new data
                    var xmap = d3.scale.linear().domain(_this.plot.xscale.range()).range(_this.plot.xscale.domain());
                    var ymap = d3.scale.linear().domain(_this.plot.yscale.range()).range(_this.plot.yscale.domain());
                    _this.attr.x = xmap(movement.x - _this.plot.attr.margin.left);
                    _this.attr.y = ymap(movement.y - _this.plot.attr.margin.top);
                    d3.select(this).select('text').text(_this.attr.text);

                    _this.attr.events.drag();
                });

            asel.call(drag);
        }

        // extend annotation object with specific shape
        var tmargin = {x: _this.attr.tmargin.x, y: _this.attr.tmargin.y};
        if (_this.attr.type == 'square') {
            asel.selectAll('.square').data([_this.attr]).enter()
                .append('rect')
                .attr('class', 'square')
                .attr('transform', 'rotate(' + _this.attr.rotate + ' ' + x + ' ' + y + ')')
                .attr('width', _this.attr.size)
                .attr('height', _this.attr.size)
                .attr('x', x - _this.attr.size / 2)
                .attr('y', y - _this.attr.size / 2);
            tmargin.y = tmargin.y - (_this.attr.size / 2) - 5;
        } else if (_this.attr.type == 'rectangle') {
            asel.selectAll('.rectangle').data([_this.attr]).enter()
                .append('rect')
                .attr('class', 'rectangle')
                .attr('transform', 'rotate(' + _this.attr.rotate + ' ' + x + ' ' + y + ')')
                .attr('width', Math.abs(_this.plot.xscale(_this.attr.width) - _this.plot.xscale(0)))
                .attr('height', Math.abs(_this.plot.yscale(_this.attr.height) - _this.plot.yscale(0)))
                .attr('x', x)
                .attr('y', y);
            tmargin.x = tmargin.x + _this.attr.text.length*2 + 2;
            tmargin.y = tmargin.y - 5;
        } else if (_this.attr.type == 'circle') {
            asel.selectAll('.circle').data([_this.attr]).enter()
                .append('circle')
                .attr('class', 'circle')
                .attr('r', _this.attr.size / 2)
                .attr('cx', x)
                .attr('cy', y);
            tmargin.y = tmargin.y - (_this.attr.size / 2) - 5;
        } else if (_this.attr.type == 'triangle') {
            asel.selectAll('.triangle').data([_this.attr]).enter()
                .append('path')
                .attr('class', 'triangle')
                .attr('transform', 'rotate(' + _this.attr.rotate + ' ' + x + ' ' + y + ')')
                .attr('d', function(d){
                    return [
                    'M' + (x - (d.size / 2)) + ',' + (y - (d.size / 2)),
                    'L' + (x + (d.size / 2)) + ',' + (y - (d.size / 2)),
                    'L' + x + ',' + (y + (d.size / 2)),
                    'Z'].join('');
                });
            tmargin.x = tmargin.x + (_this.attr.size / 2) - _this.attr.text.length*2;
            tmargin.y = tmargin.y - (_this.attr.size / 2) - 5;
        }
        if (_this.attr.text !== '') {
            asel.selectAll('.text').data([_this.attr]).enter()
                .append('text')
                .attr('class', 'text')
                .attr('x', x + tmargin.x)
                .attr('y', y + tmargin.y)
                .style("font-size", _this.attr.tsize)
                .style("text-anchor", "middle")
                .text(_this.attr.text);
        }
        
        // apply styling
        _.map(
            Object.keys(_this.attr.style),
            function(i){ asel.style(i, _this.attr.style[i]); }
        );

        return _this;
    }

    // setting up attributes
    this.attr = extend({
        parent: null,
        id: quorra.uuid(),
        type: 'text',
        text: function(d){ return d3.format('.2f')(d.x); },
        hovertext: '',
        xfixed: false,
        yfixed: false,
        size: 15,
        group: null,
        rotate: 0,
        tsize: 13,
        tposition: {x: 0, y: 20},
        tmargin: {x: 0, y: 0},
        trotation: 0,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        draggable: false,
        events: {
            drag: function() {
                quorra.log('drag event');
            },
            dragstart: function() {
                quorra.log('drag start event');
            },
            dragend: function() {
                quorra.log('drag end event');
            },
            click: function() {
                quorra.log('click event');
            }
        },
        style: {opacity: 1},
        meta: {}
    }, attributes);
    
    // binding attributes to constructor function
    parameterize(_this.attr, _this.go);
    _this.go.__parent__ = _this;
    
    // managing specialized attributes
    _this.attr.tooltip = d3.select("body").append("div")
        .attr("class", "annotation-tooltip")
        .style("position", "absolute")
        .style("opacity", 0);

    _this.go.tooltip = function(value) {
        if (!arguments.length) return _this.attr.tooltip;
        if (value == false){
            _this.attr.tooltip.remove();
        } else if (value != false) {
            _this.attr.tooltip = value;
        }
        return _this.go;
    };
    _this.go.bind = function(value) {
        if (!arguments.length) return _this.plot;
        _this.attr.parent = value;
        _this.plot = value.__parent__;
        _this.attr.parent = _this.plot.attr.id;
        return _this.go;
    };

    return _this.go;
}

quorra.annotation = function(attributes) {
    return new Annotation(attributes);
};
