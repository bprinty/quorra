===============================
quorra - A reusable visualization API built on top of d3.js
===============================


Usage:
------

Add the d3.js and underscore.js assets into your project and include the quorra javascript and css assets in your HTML document via:

```html
<link href="quorra.min.css" rel="stylesheet">
<script src="quorra.min.js"></script>
```

Quorra assets can be found in the ``dist/`` folder within this repo, and the d3.js and underscore.js assets will be in the ``lib/`` folder created by running:

```bash
bower install
```

Or, if you don't want to use bower, you could alternatively find them `here (d3.js) <https://raw.githubusercontent.com/mbostock/d3/master/d3.min.js>`_ and `here (underscore.js) <https://raw.githubusercontent.com/jashkenas/underscore/master/underscore-min.js>`_.


Documentation:
-------------
See the 


Browser/Platform Support:
--------

Quorra wil work with any browser that supports d3.js. For more details, see the d3 `wiki <https://github.com/mbostock/d3/wiki#user-content-browser--platform-support>`_.


Extensions:
----------

The idea of being able to intereact with data should be commonplace across all languages used in analyzing datasets. Several extensions have been built for using this library with popular programming languages used in statistical analyses (i.e. R, python), and more are on the way. If you are interested in developing an extension, contact `bprinty <http://github.com/bprinty>`_. Here are the set of language extensions that have been built so far:

* R: `quorra-r <http://github.com/bprinty/quorra-r>`_.
* python: `quorra-python <http://github.com/bprinty/quorra-python>`_.



Feedback:
--------

If you find a bug in quorra or would like to request a new feature, submit an issue on the GitHub issue tracker. Be sure to:

1. Be descriptive and include details about browser and dependency versioning information.
2. Mark the issue appropriately (i.e. bug/feature/improvement).

See the `contributing <https://github.com/bprinty/quorra/blob/master/CONTRIBUTING.rst>`_ page for details on contibuting to this project.


Other Links:
-----------

* `d3.js <https://github.com/mbostock/d3>`_.
* `underscore.js <https://github.com/jashkenas/underscore>`_.

