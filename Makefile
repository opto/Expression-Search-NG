.DEFAULT: build
.PHONY: build clean
# use the jq command to obtain the plugin version
VERSION = $(shell jq --raw-output .version < manifest.json)
# list of all files & dirs in the project root, except this file and any add-on archives
FILES_IN_XPI = $(filter-out $(wildcard *.xpi) Makefile, $(wildcard *))

expression-search-NG$(VERSION).xpi: $(FILES_IN_XPI)
	zip -9 -r -D $@ $^

clean:
	rm *.xpi
