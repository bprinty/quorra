==========
Quickstart
==========

.. Note:: Complete Me!


.. Note:: Working on segment below to define api.

.. code-block:: javascript

    var line = quorra.line()
        .bind('#' + id)
        .data(data);

    line.layer('zoom');
    line.layer('export'); // returns generator for 
    line.layer('crosshairs')
        .xformat(d3.format('.2f'))
        .xposition('end');
    
    var annot = line.layer('annotation'); // returns generator for annotation
    annot.add('rect')
        .width(50).height(50);

    // alternatively
    line.layer('annotation', [{
        'type': 'rect',
        'width': 50,
        'height': 50
    }]); // should return generator for line

    // annotatable
    line.layer('annotate', {

    });

    line.render();