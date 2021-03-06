console.log("phantomjs> jasmine_xmlrunner starting");
var htmlrunner,
    resultdir,
    page,
    fs;

phantom.injectJs("lib/utils/core.js")

var system = require('system');

if ( system.args.length !== 3 ) {
    console.log("Usage: phantom_test_runner.js HTML_RUNNER RESULT_DIR");
    phantom.exit();
} else {
    htmlrunner = system.args[1];
    resultdir = system.args[2];
    page = require("webpage").create();
    fs = require("fs");
    
    // Echo the output of the tests to the Standard Output
    page.onConsoleMessage = function(msg, source, linenumber) {
        console.log(msg);
    };

    page.open(htmlrunner, function(status) {
        if (status === "success") {
            utils.core.waitfor(function() { // wait for this to be true
                console.log("phantomjs> waiting for results")
                return page.evaluate(function() {
                    return typeof(jasmine.phantomjsXMLReporterPassed) !== "undefined";
                });
            }, function() { // once done...
                // Retrieve the result of the tests
                var f = null, i, len;
                    suitesResults = page.evaluate(function(){
                    return jasmine.phantomjsXMLReporterResults;
                });
                if (suitesResults) {
                    // Save the result of the tests in files
                    for ( i = 0, len = suitesResults.length; i < len; ++i ) {
                        try {
                            f = fs.open(resultdir + '/' + suitesResults[i]["xmlfilename"], "w");
                            f.write(suitesResults[i]["xmlbody"]);
                            f.close();
                            
                            // Print to console too
                            // console.log(suitesResults[i]["xmlbody"]);
                        } catch (e) {
                            console.log(e);
                            console.log("phantomjs> Unable to save result of Suite '"+ suitesResults[i]["xmlfilename"] +"'");
                        }
                    }
                }
                else {
                    console.log("phantomjs> No results returned")
                }
                
                // Return the correct exit status. '0' only if all the tests passed
                phantom.exit(page.evaluate(function(){
                    return jasmine.phantomjsXMLReporterPassed ? 0 : 1; //< exit(0) is success, exit(1) is failure
                }));
            }, function() { // or, once it timesout...
                console.log("phantomjs> timeout");
                phantom.exit(1);
            });
        } else {
            console.log("phantomjs> Could not load '" + htmlrunner + "'.");
            phantom.exit(1);
        }
    });
}
