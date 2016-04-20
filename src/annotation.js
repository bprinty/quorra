function Annotation(attributes) {
    /**
    Annotation()

    Object for managing plot rendering, and extending
    common functionality across all plot models.

    @author <bprinty@gmail.com>
    */

    quorra.log('instantiating annotation object');

    if (typeof attributes === 'undefined') attributes = {};
    if (typeof plot === 'undefined') plot = 'body';
    var _this = this;

    // constructor
    this.go = function() {
        quorra.log('running annotation generator function');

        // set up tooltip
        if (_this.attr.tooltip) {
            _this.attr.tooltip = _this.plot.selection.append("div")
                .attr("class", "annotation-tooltip")
                .style("position", "fixed")
                .style("visibility", "hidden");
        }

        // create wrapper element for annotation groups
        _this.plot.plotarea.selectAll('.annotation#' + _this.attr.id).remove();
        var cl = (_this.attr.group === null) ? 'annotation ' + _this.attr.type : 'annotation ' + _this.attr.type + ' g_' + _this.attr.group;
        var asel = _this.plot.plotarea.append('g')
            .attr('id', _this.attr.id).attr('class', cl)
            .style("visibility", function() {
                return _.contains(_this.plot.attr.toggled, _this.plot.attr.group(_this.attr)) ? 'none' : 'visible';
            }).style('opacity', _this.attr.style.opacity)
            .on('mouseover', function() {
                d3.select(this).style('opacity', 0.75*_this.attr.style.opacity);
                if (_this.attr.tooltip) {
                    _this.attr.tooltip.html(_this.attr.hovertext)
                        .style("visibility", "visible")
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
                    _this.attr.tooltip.style("visibility", "hidden");
                }
            }).on('click', function() {
                _this.attr.events.click(_this.attr);
            });
        
        // enable drag behavior for annotation (if available and specified)
        var x = _this.plot.xscale(_this.attr.x);
        var y = _this.plot.yscale(_this.attr.y);
        if (_this.attr.draggable && !_this.plot.attr.zoomable) {
            var drag = d3.behavior.drag()
                .on("dragstart", function() {
                    _this.attr.events.dragstart(_this.attr);
                }).on("dragend", function() {
                     _this.attr.events.dragend(_this.attr);
                }).on("drag", function() {
                    // get mouse coordinates
                    var movement = mouse(_this.plot.attr.svg);
                    var xoffset = Math.abs(_this.plot.xscale(_this.attr.width) - _this.plot.xscale(0));
                    var yoffset = Math.abs(_this.plot.yscale(_this.attr.height) - _this.plot.yscale(0));
                    xoffset = (_this.attr.type === 'rect') ? xoffset / 2 : 0;
                    yoffset = (_this.attr.type === 'rect') ? yoffset / 2: 0;
                    var xcoord = movement.x - _this.plot.attr.margin.left - xoffset;
                    var ycoord = movement.y - _this.plot.attr.margin.top - yoffset;

                    // translate annotation object
                    var xmotion = _.center(xcoord, [0, _this.plot.innerwidth - 2*xoffset]);
                    var ymotion = _.center(ycoord, [0, _this.plot.innerheight - 2*yoffset]);
                    d3.select(this).attr('transform', 'translate(' + (xmotion - x) + ',' + (ymotion - y) + ')');
                    
                    // update annotation attributes with new data
                    var xmap = d3.scale.linear().domain(_this.plot.xscale.range()).range(_this.plot.xscale.domain());
                    var ymap = d3.scale.linear().domain(_this.plot.yscale.range()).range(_this.plot.yscale.domain());
                    _this.attr.x = xmap(xmotion);
                    _this.attr.y = ymap(ymotion);
                    d3.select(this).select('text').text(_this.attr.text);

                    _this.attr.events.drag(_this.attr);
                });

            asel.call(drag);
        }

        // extend annotation object with specific shape
        var aobj;
        if (_this.attr.type === 'rect') {
            aobj = asel.selectAll('.rect').data([_this.attr]).enter()
                .append('rect')
                .attr('class', 'rect')
                .attr('transform', 'rotate(' + _this.attr.rotate + ' ' + x + ' ' + y + ')')
                .attr('width', Math.abs(_this.plot.xscale(_this.attr.width) - _this.plot.xscale(0)))
                .attr('height', Math.abs(_this.plot.yscale(_this.attr.height) - _this.plot.yscale(0)))
                .attr('x', x)
                .attr('y', y);
        } else if (_this.attr.type === 'circle') {
            aobj = asel.selectAll('.circle').data([_this.attr]).enter()
                .append('circle')
                .attr('class', 'circle')
                .attr('r', _this.attr.size / 2)
                .attr('cx', x)
                .attr('cy', y);
        } else if (_this.attr.type === 'triangle') {
            aobj = asel.selectAll('.triangle').data([_this.attr]).enter()
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
        }

        // apply styling
        if (_this.attr.type !== 'text'){
            _.map(
                _.without(Object.keys(_this.attr.style), 'opacity'),
                function(i){ aobj.style(i, _this.attr.style[i]); }
            );
        }
        
        // show text
        if (_this.attr.text !== '') {
            asel.selectAll('.text').data([_this.attr]).enter()
                .append('text')
                .attr('class', 'text')
                .attr('x', function(d) {
                    var txt = (typeof d.text === 'function') ? d.text(d) : d.text;
                    var xnew = x + d.tmargin.x + txt.toString().length*2;
                    if (d.type === 'rect') {
                        return xnew + 2;
                    } else if (d.type === 'circle') {
                        return x + d.tmargin.x;
                    } else if (d.type === 'triangle') {
                        return x + d.tmargin.x + (d.size / 2) - txt.toString().length*3;
                    } else {
                        return x + d.tmargin.x;
                    }
                })
                .attr('y', function(d) {
                    var ynew = y - (d.size / 2) - 5;
                    if (d.type === 'rect') {
                        return y - d.tmargin.y - 5;
                    } else if (d.type === 'circle') {
                        return ynew;
                    } else if (d.type === 'triangle') {
                        return ynew;
                    } else {
                        return y - d.tmargin.y;
                    }
                })
                .style("font-size", _this.attr.tsize)
                .style("text-anchor", "middle")
                .text(_this.attr.text);
        }

        return _this;
    };

    // setting up attributes
    this.attr = extend({
        parent: null,
        id: quorra.uuid(),
        type: 'text',
        text: '',
        // text: function(d){ return d3.format('.2f')(d.x); },
        hovertext: '',
        xfixed: false,
        yfixed: false,
        size: 15,
        group: null,
        rotate: 0,
        tsize: 12,
        tposition: {x: 0, y: 20},
        tmargin: {x: 0, y: 0},
        trotation: 0,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        draggable: false,
        tooltip: true,
        events: {
            add: function() {
                quorra.log('add event');
            },
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
    quorra.log('creating plot annotation');
    return new Annotation(attributes);
};
