# -- 
#
# quorra makefile
# 
# @author <bprinty@gmail.com>
# ------------------------------------------------

# config
# ------
DIST_PATH = dist
TESTS     = 
VERSION   = `python -c 'import json; print json.load(open("package.json", "r"))["version"]'`


# targets
# -------
default: build
	@true


requirements:
	bower install
	npm install


build:
	grunt


.PHONY: test
test:
	# run javascript-based tests


clean:
	rm -rf build node_modules lib


release: test build
	git add dist/quorra.js
	git add dist/quorra.css
	TAG=$(VERSION) && git commit -m "quorra, release $$TAG" || echo "distribution already added"
	TAG=$(VERSION) && git tag -d $$TAG || echo "local tag available"
	TAG=$(VERSION) && git push origin :$$TAG || echo "remote tag available"
	TAG=$(VERSION) && git tag $$TAG && git push origin $$TAG
