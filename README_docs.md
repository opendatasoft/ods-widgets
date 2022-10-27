# ODS Widgets documentation generation

## Introduction

Docs are being generated from in-code comments written in ngdoc, a flavour of jsdoc.

Links:  

* [usejsdoc.org](http://usejsdoc.org/)
* [github.com/angular/angular.js: Writing AngularJS Documentation](https://github.com/angular/angular.js/wiki/Writing-AngularJS-Documentation)
* [chirayuk.com: snippets > angularjs > ngdoc](http://www.chirayuk.com/snippets/angularjs/ngdoc)

## Config

A working setup to generate the documentation

* Node version `v8.17.0`
* NPM version `6.13.4`
* Grunt version `grunt-cli v1.4.3 grunt v1.0.3`

## Generating docs

Once your ndocs are written, ensure npm modules are properly installed (`npm install`) and then simply run `grunt ngdocs`.

You can then run the server `grunt server` and access the documentation from localhost:9001/docs
