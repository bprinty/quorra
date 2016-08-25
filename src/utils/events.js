/*

Event handling within quorra.

@author <bprinty@gmail.com>

*/

import { quorra } from '../quorra.js';

// key map and default event definitions
var baseKeys = { 16: 'Shift', 17: 'Ctrl', 18: 'Alt', 27: 'Esc'};
var metaKeys = { 9: 'Tab', 13: 'Enter', 65: 'A', 66: 'B', 67: 'C', 68: 'D', 69: 'E', 70: 'F', 71: 'G', 72: 'H', 73: 'I', 74: 'J', 75: 'K', 76: 'L', 77: 'M', 78: 'N', 79: 'O', 80: 'P', 81: 'Q', 82: 'R', 83: 'S', 84: 'T', 85: 'U', 86: 'V', 87: 'W', 88: 'X', 89: 'Y', 90: 'Z'};
var allKeys = _.extend(_.clone(baseKeys), metaKeys);


// setting statuses for each key combination
quorra.keys = {};
_.each(allKeys, function(key){
    quorra.keys[key] = false;
});


// setting default functions for each key combination
quorra.events = {};
_.each(baseKeys, function(base){

    quorra.events[base] = {
        down: function(){},
        up: function(){}
    }
    _.each(metaKeys, function(meta){
        quorra.events[base + meta] = {
            down: function(){},
            up: function(){}
        }
    });
});


document.onkeydown = function (e) {
    /**
    Key down event handlers. Allows for event triggering on
    key press if methods for each key combination are specified.

    To set a method for a specific key down event, do:

    quorra.events.ShiftA.up = function(){
        console.log('Shift + A Pressed!');
    }

    @author <bprinty@gmail.com>
    */

    e = e || window.event;
    var k = e.which;
    if (_.has(allKeys, k)){
        quorra.keys[allKeys[k]] = true;
        if (_.has(metaKeys, k)){
            _.each(baseKeys, function(i){
                if (quorra.keys[i]){
                    quorra.events[i+metaKeys[k]].down();
                }
            });
        }else{
            quorra.events[allKeys[k]].down();
        }
    }
};


document.onkeyup = function (e) {
     /**
    Key up event handlers. Allows for event triggering on
    key release if methods for each key combination are specified.

    To set a method for a specific key down event, do:

    quorra.events.ShiftA.down = function(){
        console.log('Shift + A Released!');
    }

    @author <bprinty@gmail.com>
    */

    e = e || window.event;
    var k = e.which;
    if (_.has(allKeys, k)){
        quorra.keys[allKeys[k]] = false;
        if (_.has(metaKeys, k)){
            _.each(baseKeys, function(i){
                if (quorra.keys[i]){
                    quorra.events[i+metaKeys[k]].up();
                }
            });
        }else{
            quorra.events[allKeys[k]].up();
        }
    }
};


// return processed mouse coordinates from selection
function mouse(sel){
    var coordinates = d3.mouse(sel.node());
    var res = {};
    res.x = coordinates[0];
    res.y = coordinates[1];
    res.scale = (d3.event.type == 'zoom') ? d3.event.scale : 1;
    return res;
}


// return ratio of domain/range for scaling zoom
function zoomscale(scale){
    var d = scale.domain();
    var r = scale.range();
    var dx = Math.abs(d[1] - d[0]);
    var dr = Math.abs(r[1] - r[0]);
    return dx/dr;
}


