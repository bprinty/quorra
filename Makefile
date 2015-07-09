#
# Quorra Makefile
#
# @author <bprinty@gmail.com>
# ------------------------------------------------------

BUILD_PATH = build

default: build
	@true

deps:
	bower install

build:
	# minify javascript files

test:
	# run javascript-based tests

clean:
	rm -rf build

