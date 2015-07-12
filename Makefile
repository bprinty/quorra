#
# Quorra Makefile
#
# @author <bprinty@gmail.com>
# ------------------------------------------------------

BUILD_PATH = dist

default: build
	@true

deps:
	bower install
	npm install

build:
	grunt

test:
	# run javascript-based tests

clean:
	rm -rf build node_modules lib

