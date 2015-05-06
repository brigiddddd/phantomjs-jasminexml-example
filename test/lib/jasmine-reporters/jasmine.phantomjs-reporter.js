(function() {
    var debug = 0;

    if (! jasmine) {
        throw new Exception("jasmine library does not exist in global namespace!");
    }

    function elapsed(startTime, endTime) {
        return (endTime - startTime)/1000;
    }

    function ISODateString(d) {
        function pad(n) { return n < 10 ? '0'+n : n; }

        return d.getFullYear() + '-'
            + pad(d.getMonth()+1) +'-'
            + pad(d.getDate()) + 'T'
            + pad(d.getHours()) + ':'
            + pad(d.getMinutes()) + ':'
            + pad(d.getSeconds());
    }

    function trim(str) {
        return str.replace(/^\s+/, "" ).replace(/\s+$/, "" );
    }

    function escapeInvalidXmlChars(str) {
        return str.replace(/\&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/\>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/\'/g, "&apos;");
    }

    /**
     * PhantomJS Reporter generates JUnit XML for the given spec run.
     * Allows the test results to be used in java based CI.
     * It appends some DOM elements/containers, so that a PhantomJS script can pick that up.
     *
     * @param {boolean} consolidate whether to save nested describes within the
     *                  same file as their parent; default: true
     * @param {boolean} useDotNotation whether to separate suite names with
     *                  dots rather than spaces (ie "Class.init" not
     *                  "Class init"); default: true
     * @param {string}     testPathName the path of where this test lives (so it will match other 
     *                        JUnit tests in the same directory)
     *                    e.g. "com.imagenow.forms.javascript."
     */
    var PhantomJSReporter =  function(consolidate, useDotNotation, testPathName) {
        this.consolidate = consolidate === jasmine.undefined ? true : consolidate;
        this.useDotNotation = useDotNotation === jasmine.undefined ? true : useDotNotation;
        
        // To match the naming of other unit tests. There's probably a better way of doing this.
        this.testPathName = testPathName === jasmine.undefined ? true : testPathName;
    };  

    PhantomJSReporter.prototype = {
           jasmineStarted: function(suiteInfo) {
               if (debug) {
                   this.log('Running suite with ' + suiteInfo.totalSpecsDefined);
               }

               this._suites = [];
           },

           suiteStarted: function(suite) {
        	   if (debug) {
                   this.log("Suite started: '" + suite.description + "' whose full description is: " + suite.fullName);
               }

               suite.startTime = new Date();
	           suite.specs = [];
	
	           this._currentSuite = suite;
	           this._suites.push(suite);
           },

           specStarted: function(spec) {
               if (debug) {
                   this.log("Spec started: '" + spec.description + "' whose full description is: " + spec.fullName);
               }

               spec.startTime = new Date();
           },

           specDone: function(spec) {
               if (debug) {
                   this.log("Spec: '" + spec.description + "' was " + spec.status);
               }

               spec.duration = elapsed(spec.startTime, new Date());
               spec.output = '<testcase classname="' + this.getFullName(this._currentSuite) +
               '" name="' + escapeInvalidXmlChars(spec.description) + '" time="' + spec.duration + '">';

               var failure = '';
               var failures = spec.failedExpectations.length;

               for (var i = 0; i < failures; i++) {
            	   failure += ((i + 1) + ": " + escapeInvalidXmlChars(spec.failedExpectations[0].message) + " ");
                
            	   if (debug){
            		   this.log("(specDone) FAILURE: " + failure);
            	   }
               }
               if (failure) {
            	   spec.output += "<failure>" + trim(failure) + "</failure>";
               }
               spec.output += "</testcase>";
            
               this._currentSuite.specs.push(spec);

               if (debug) {
            	   this.log("(specDone) SPEC OUTPUT: \n" + spec.output);
               }
           },

           suiteDone: function(suite) {
               if (debug) {
                   this.log("Suite: '" + suite.description + "' was " + suite.status);
               }

               suite.startTime = suite.startTime || new Date();
               suite.duration = elapsed(suite.startTime, new Date());

               var specs = this._currentSuite.specs;
               var specsOutput = "";

               var failedCount = 0;
            
               for (var i = 0; i < specs.length; i++) {
            	   specsOutput += "\n  " + specs[i].output;

            	   if (specs[i].status === "failed") {
            		   failedCount++;
            	   }
               }
            
               if (debug) {
                   this.log("(suiteDone) SPECS LENGTH = " + specs.length);
                   this.log("(suiteDone) SUITE FAILED COUNT = " + failedCount);
                   this.log("(suiteDone) SPECS OUTPUT: \n" + specsOutput);
               }
               suite.output = '\n<testsuite name="' + this.getFullName(suite) +
                	'" errors="0" tests="' + specs.length + '" failures="' + failedCount +
                	'" time="' + suite.duration + '" timestamp="' + ISODateString(suite.startTime) + '">';
               suite.output += specsOutput;
               suite.output += "\n</testsuite>";

               this._currentSuite = null;

               if (debug) {
                   this.log("(suiteDone) SUITE OUTPUT: \n" + suite.output);
               }
           },

        jasmineDone: function() {
            if (debug) {
                this.log('Finished suite');
            }

            var suites = this._suites,
            passed = true;

            for (var curSuite = 0; curSuite < suites.length; curSuite++) {
                var suite = suites[curSuite],
                    path = this.testPathName,
                    filename = 'TEST-' + path + this.getFullName(suite, true) + '.xml',
                    output = '<?xml version="1.0" encoding="UTF-8" ?>';

                passed = passed && suite.failedExpectations.length == 0;
                
                for (var curSpec = 0; curSpec < suite.specs.length; curSpec++) {
                	var spec = suite.specs[curSpec];
                	passed = passed && spec.failedExpectations.length == 0;
                }

                output += suite.output;
                this.createSuiteResultContainer(filename, output);
            }
            this.createTestFinishedContainer(passed);

            this._suites = null;
        },

        createSuiteResultContainer: function(filename, xmloutput) {
            jasmine.phantomjsXMLReporterResults = jasmine.phantomjsXMLReporterResults || [];
            jasmine.phantomjsXMLReporterResults.push({
                "xmlfilename" : filename,
                "xmlbody" : xmloutput
            });
        },
        
        createTestFinishedContainer: function(passed) {
            jasmine.phantomjsXMLReporterPassed = passed
        },

        getFullName: function(suite, isFilename) {
            var fullName;
            if (this.useDotNotation) {
                fullName = suite.description;
                for (var parentSuite = suite.parentSuite; parentSuite; parentSuite = parentSuite.parentSuite) {
                    fullName = parentSuite.description + '.' + fullName;
                }
            }
            else {
                fullName = suite.getFullName();
            }

            // Either remove or escape invalid XML characters
            if (isFilename) {
                return fullName.replace(/[^\w]/g, "");
            }
            return escapeInvalidXmlChars(fullName);
        },

        log: function(str) {
            var console = jasmine.getGlobal().console;

            if (console && console.log) {
                console.log(str);
            }
        }
    };

    // export public
    jasmine.PhantomJSReporter = PhantomJSReporter;
})();
