/*!
 * updatemybrowser.org JavaScript Library v1
 * http://updatemybrowser.org/
 *
 * Copyright 2015, Joram van den Boezem
 * Licensed under the GPL Version 3 license.
 * http://www.gnu.org/licenses/gpl.html
 * 
 */
;

UMB = function () {

    var hasInit = false;
    var hasLoaded = false;
    var config = {};

    /*
     * Recursively merge properties of two objects
     */
    function mergeRecursive(obj1, obj2, lvl) {
        var lvl = lvl || 0;
        for (var p in obj1) {
            try {
                if (obj2[p].constructor == Object) {
                    obj1[p] = mergeRecursive(obj1[p], obj2[p], lvl + 1);
                } else {
                    obj1[p] = obj2[p];
                }
            } catch (e) {
            }
        }
        return obj1;
    }

    var init = function () {
        if (hasInit) {
            return;
        }
        hasInit = true;

        UMB.Detect.init();

        var _umb = window._umb || {};
        config = {
            require: {
                chrome: UMB.Browsers['chrome'].minimum,
                firefox: UMB.Browsers['firefox'].minimum,
                ie: UMB.Browsers['ie'].minimum,
                opera: UMB.Browsers['opera'].minimum,
                safari: UMB.Browsers['safari'].minimum,
                edge: UMB.Browsers['edge'].minimum
            },
            display: true,
            nonCritical: false
        };
        config = mergeRecursive(config, _umb);
    };

    return {

        load: function () {
            if (hasLoaded) {
                return;
            }
            hasLoaded = true;

            UMB.attach(window, 'load', function () {
                init();
                // Display at all?
                if (config.display) {
                    UMB.autoDisplayWidget();
                }
            });
        },

        // http://stackoverflow.com/questions/9434/how-do-i-add-an-additional-window-onload-event-in-javascript
        attach: function (elm, event, callback) {
            if (elm.addEventListener) { // W3C standard
                window.addEventListener(event, callback, false);
            } else if (elm.attachEvent) { // Microsoft
                elm.attachEvent('on' + event, callback);
            }
        },

        getConfig: function () {
            init();
            return config;
        },

        getCurrentBrowser: function () {
            init();
            return UMB.Detect.browser;
        },

        getCurrentVersion: function () {
            init();
            return UMB.Detect.version;
        },

        getBrowserInfo: function (browser) {
            init();
            return UMB.Browsers[browser];
        },

        getStatus: function () {
            init();
            return UMB.Status.getStatus();
        },

        displayWidget: function () {
            init();
            UMB.Widget.display();
        },

        hideWidget: function () {
            init();
            UMB.Widget.hide();
        },

        autoDisplayWidget: function () {
            init();

            // Cookie set to hide bar?
            if (document.cookie.indexOf('_umb=hide') == -1) {
                var status = UMB.getStatus();

                if (status == 'update' && config.nonCritical) {
                    // Display on recommended update
                    UMB.displayWidget();
                } else if (status == 'warning') {
                    // Display on critical update
                    UMB.displayWidget();
                }
            }
        },

        scrollToTop: function () {
            // http://stackoverflow.com/questions/871399/cross-browser-method-for-detecting-the-scrolltop-of-the-browser-window
            var B = document.body; //IE 'quirks'
            var D = document.documentElement; //IE with doctype
            D = (B.clientHeight) ? B : D;
            D.scrollTop = 0;
        }
    };
}();
UMB.load();/*!
 * updatemybrowser.org JavaScript Library v1
 * http://updatemybrowser.org/
 *
 * Copyright 2012, Joram van den Boezem
 * Licensed under the GPL Version 3 license.
 * http://www.gnu.org/licenses/gpl.html
 * 
 */
;if (typeof UMB === "undefined") {UMB = function() {}};

UMB.Browsers = {
		chrome: {
				name: "Chrome",
				vendor: "Google",
				current: "62",
				minimum: "61",
				update_url: "https://www.google.com/chrome/browser/desktop/index.html",
				info_url: "http://www.google.com/chrome/intl/en/more/index.html"
		},
		safari: {
				name: "Safari",
				vendor: "Apple",
				current: "11",
				minimum: "10",
				update_url: "http://www.apple.com/safari/",
				info_url: "http://www.apple.com/safari/"
		},
		edge: {
				name: "Edge",
				vendor: "Microsoft",
				current: "16",
				minimum: "15",
				update_url: "https://www.microsoft.com/en-us/download/details.aspx?id=48126",
				info_url: "https://www.microsoft.com/en-us/windows/microsoft-edge"
		},
		firefox: {
				name: "Firefox",
				vendor: "Mozilla",
				current: "56",
				minimum: "55",
				update_url: "http://www.getfirefox.com/",
				info_url: "https://www.mozilla.org/firefox/desktop/"
		},
		ie: {
				name: "Internet Explorer",
				vendor: "Microsoft",
				current: "11",
				minimum: "10",
				update_url: "http://www.microsoft.com/ie",
				info_url: "http://windows.microsoft.com/internet-explorer"
		},
		opera: {
				name: "Opera",
				vendor: null,
				current: "48",
				minimum: "47",
				update_url: "http://www.opera.com/browser/",
				info_url: "http://www.opera.com/browser/features/"
		}
};
/*!
 * updatemybrowser.org JavaScript Library v1
 * http://updatemybrowser.org/
 *
 * Copyright 2015, Joram van den Boezem
 * Licensed under the GPL Version 3 license.
 * http://www.gnu.org/licenses/gpl.html
 * 
 */
/*!
 * Based on Browser detect script by Peter-Paul Koch
 * See http://www.quirksmode.org/js/detect.html
 */
;if (typeof UMB === "undefined") {UMB = function(){}};

UMB.Detect = {
    init: function () {
        this.browser = this.searchString(this.dataBrowser) || "unknown";
        this.version = this.searchVersion(navigator.userAgent)
            || this.searchVersion(navigator.appVersion)
            || "an unknown version";
        this.OS = this.searchString(this.dataOS) || "unknown";
    },
    searchString: function (data) {
        for (var i = 0; i < data.length; i++) {
            var dataString = data[i].string;
            var dataProp = data[i].prop;
            this.versionSearchString = data[i].versionSearch || data[i].identity;
            if (dataString) {
                if (dataString.indexOf(data[i].subString) != -1)
                    return data[i].identity;
            }
            else if (dataProp)
                return data[i].identity;
        }
    },
    searchVersion: function (dataString) {
        var index = dataString.indexOf(this.versionSearchString);
        if (index == -1) return;
        return parseFloat(dataString.substring(index + this.versionSearchString.length + 1));
    },
    dataBrowser: [
        {
            string: navigator.userAgent,
            subString: "OPR/",
            identity: "opera",
            versionSearch: "OPR"
        },
        {
            string: navigator.userAgent,
            subString: "Edge",
            identity: "edge",
            versionSearch: "Edge"
        },
        {
            string: navigator.userAgent,
            subString: "Chrome",
            versionSearch: "Chrome",
            identity: "chrome"
        },
        {
            string: navigator.vendor,
            subString: "Apple",
            identity: "safari",
            versionSearch: "Version"
        },
        {
            string: navigator.userAgent,
            subString: "Firefox",
            versionSearch: "Firefox",
            identity: "firefox"
        },
        {
            string: navigator.userAgent,
            subString: "MSIE",
            identity: "ie",
            versionSearch: "MSIE"
        },
        {
            string: navigator.userAgent,
            subString: "Trident",
            identity: "ie",
            versionSearch: "rv"
        }
    ],
    dataOS: [
        {
            string: navigator.userAgent,
            subString: "iPhone",
            identity: "iOS"
        },
        {
            string: navigator.userAgent,
            subString: "iPad",
            identity: "iOS"
        },
        {
            string: navigator.userAgent,
            subString: "Android",
            identity: "Android"
        },
        {
            string: navigator.platform,
            subString: "Win",
            identity: "Windows"
        },
        {
            string: navigator.platform,
            subString: "Mac",
            identity: "Mac"
        },
        {
            string: navigator.platform,
            subString: "Linux",
            identity: "Linux"
        }
    ]
};/*!
 * updatemybrowser.org JavaScript Library v1
 * http://updatemybrowser.org/
 *
 * Copyright 2015, Joram van den Boezem
 * Licensed under the GPL Version 3 license.
 * http://www.gnu.org/licenses/gpl.html
 * 
 */
/*!
 * Require UMB.Detect
 * Require UMB.Browsers
 */
;if (typeof UMB === "undefined") {UMB = function(){}};

UMB.Status = function () {

    var STATUS_LATEST = 'latest';
    var STATUS_UPDATE = 'update';
    var STATUS_WARNING = 'warning';
    var STATUS_UNSUPPORTED = 'unsupported';

    return {
        getStatus: function () {
            var browser = UMB.getBrowserInfo(UMB.Detect.browser);
            var os = UMB.Detect.OS;
            if (!browser || os == 'iOS' || os == 'Android') return STATUS_UNSUPPORTED;
            var latestVersion = parseFloat(browser.current);
            var minimumVersion = parseFloat(UMB.getConfig().require[UMB.Detect.browser]);
            if (UMB.Detect.version >= latestVersion) {
                return STATUS_LATEST;
            } else if (UMB.Detect.version >= minimumVersion) {
                return STATUS_UPDATE;
            } else {
                return STATUS_WARNING;
            }
        }
    };
}();/*!
 * updatemybrowser.org JavaScript Library v1
 * http://updatemybrowser.org/
 *
 * Copyright 2012, Joram van den Boezem
 * Licensed under the GPL Version 3 license.
 * http://www.gnu.org/licenses/gpl.html
 * 
 */
/*!
 * Require UMB.Status
 */
;if (typeof UMB === "undefined") {UMB = function(){}};

UMB.Widget = function () {

    var hasInit = false;
    var isFixed = false;

    var oldBodyMarginTop;

    var applyStyle = function (style, elm) {
        for (var x in style) {
            elm.style[x] = style[x];
        }
        ;
    };

    var setCookie = function (key, value, days) {
        var exdate = new Date();
        exdate.setDate(exdate.getDate() + days);
        var content = encodeURIComponent(value) + ((days == null) ? '' : '; expires=' + exdate.toUTCString()) + '; path=/';
        document.cookie = key + '=' + content;
    };

    var insertHtml = function () {

        // CLEAN UP OLD WRAPPER
        isFixed = false;
        var oldWrapper = document.getElementById('BrowserBar');
        if (oldWrapper) {
            document.getElementsByTagName('body')[0].removeChild(oldWrapper);
        }

        // WRAPPER
        var wrapper = document.createElement('div');
        var wrapperStyle = {
            display: 'none',
            position: 'absolute',
            height: '19px',
            fontSize: '14px',
            lineHeight: '1em',
            fontFamily: 'Arial, sans-serif',
            color: 'black',
            padding: '10px 0',
            top: '-40px',
            left: '0px',
            backgroundColor: '#FDF2AB',
            backgroundImage: 'url(//updatemybrowser.org/warning.gif)',
            backgroundPosition: '10px center',
            backgroundRepeat: 'no-repeat',
            borderBottom: '1px solid #A29330',
            width: '100%',
            textAlign: 'left',
            cursor: 'pointer',
            zoom: '1',
            zIndex: 9999,
            '-webkit-box-sizing': 'content-box',
            '-moz-box-sizing': 'content-box',
            'box-sizing': 'content-box',
            overflow: 'hidden'
        };
        applyStyle(wrapperStyle, wrapper);
        wrapper.setAttribute('id', 'BrowserBar');

        // PARAGRAPH
        var p = document.createElement('p');
        var pStyle = {
            margin: '0px 0px 0px 40px',
            padding: '0px',
            lineHeight: '1.5em'
        };
        applyStyle(pStyle, p);

        // CLOSE BUTTON
        var a = document.createElement('a');
        a.href = 'javascript:void(0);';
        a.title = 'Don\'t show me this notification bar for the next 24 hours';
        a.onclick = function (e) {
            if (!e) {
                var e = window.event;
            }
            e.cancelBubble = true;
            if (e.stopPropagation) {
                e.stopPropagation();
            }

            UMB.Widget.hidePersistent(1);
            return false;
        };
        var aStyle = {
            display: 'block',
            width: '20px',
            height: '20px',
            margin: '0px 0px 0px 40px',
            padding: '0px',
            lineHeight: '1.5em',
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundImage: 'url(//updatemybrowser.org/close.gif)',
            backgroundPosition: '0 0',
            backgroundRepeat: 'no-repeat'
        };
        applyStyle(aStyle, a);

        wrapper.appendChild(p);
        wrapper.appendChild(a);
        document.getElementsByTagName('body')[0].appendChild(wrapper);
    };

    var prepareHtml = function () {
        // Get current browser info and status
        var status = UMB.getStatus();
        var browser = UMB.getBrowserInfo(UMB.getCurrentBrowser());
        var version = UMB.getCurrentVersion();

        if (!status || !browser || !version) return;

        var wrapper = document.getElementById('BrowserBar');
        var link = document.createElement('a');
        link.href = 'https://www.updatemybrowser.org';
        link.onclick = function () {
            return false;
        };
        link.style.color = '#2183d0';
        link.style.fontWeight = 'bold';
        link.target = '_blank';

        var message = '';
        var post = '';
        if (status == 'latest') {
            message = 'You have the latest version of your browser installed (' + browser.name + ' ' + version + '). ';
            link.style.color = '#00A651';
            link.appendChild(document.createTextNode('Learn more'));
        } else if (status == 'update') {
            message = 'An update (' + browser.name + ' ' + browser.current + ') is available for your browser. Please ';
            link.appendChild(document.createTextNode('install this browser update'));
            post = '.';
        } else if (status == 'warning') {
            message = 'An important update (' + browser.name + ' ' + browser.current + ') is available for your browser. Please ';
            link.style.color = '#ED1C24';
            link.appendChild(document.createTextNode('install this critical browser update'));
            post = '.';
            isFixed = true;	// make position fixed
        }
        wrapper.getElementsByTagName('p')[0].appendChild(document.createTextNode(message));
        wrapper.getElementsByTagName('p')[0].appendChild(link);
        wrapper.getElementsByTagName('p')[0].appendChild(document.createTextNode(post));

        // Make click event on BrowserBar go to link
        document.getElementById('BrowserBar').onclick = function () {
            window.open(link.href);
        };
    };

    var getComputedVal = function (elm, property) {
        var r;
        if (window.getComputedStyle) {
            r = window.getComputedStyle(elm)[property];
        } else if (elm.currentStyle) {
            r = elm.currentStyle[property];
        }
        if (!r) {
            r = elm.style[property];
        }
        return r;
    };

    var animate = function (elm, property, end, length, callback, pre, post) {
        // Animate opacity for IE
        if (property == 'opacity') {
            animate(elm, 'filter', end * 100, length, callback, 'alpha(opacity=', ')');
        }

        // Set property syntax
        var pxProps = '|top|marginTop|';
        pre = pre || '';
        post = post || '';
        if (pxProps.indexOf(property) > -1) {
            post = post || 'px';
        }

        // Begin value
        var begin = parseFloat(getComputedVal(elm, property).replace(pre, '').replace(post, '')) || 0;

        // Relative value?
        if (end.toString().indexOf('+') == 0 || end.toString().indexOf('-') == 0) {
            end = begin + parseFloat(end);
        }

        // Setup variables
        var interval = 10;
        var percstep = 1 / (length / interval);
        var perc = 0;

        // Setup helpers
        var prop = function (p) {
            var easedP = 0.5 - Math.cos(p * Math.PI) / 2;
            var propStep = (end - begin) * easedP;
            var newProp = begin + propStep;
            return Math.round(newProp * 100) / 100;
        };
        var apply = function (v) {
            elm.style[property] = pre + v + post;
        };

        // Make an interval
        var timer = setInterval(function () {
            perc = perc + percstep;
            apply(prop(perc));

            if (perc >= 1) {
                clearInterval(timer);
                apply(prop(1));
                if (callback) {
                    callback();
                }
            }
        }, interval);
    };

    var showBar = function () {
        var body = document.getElementsByTagName('body')[0];
        var BrowserBar = document.getElementById('BrowserBar');

        // Hide bar body only when BrowserBar is invisible
        if (getComputedVal(BrowserBar, 'display') !== 'none') {
            return;
        }

        // Add body class
        body.className += ' umb-active';

        // BrowserBar
        BrowserBar.style.opacity = '0';
        BrowserBar.style.filter = 'alpha(opacity=0)';
        BrowserBar.style.display = 'block';
        animate(BrowserBar, 'opacity', 0.95, 600);

        if ((UMB.getCurrentBrowser() == 'ie' && document.compatMode == 'BackCompat')) {
            // Reposition BrowserBar for IE quirks workaround
            BrowserBar.style.top = '0px';
            BrowserBar.style.width = (document.documentElement.clientWidth || document.body.clientWidth) + 'px';
        } else {
            // Reposition body element
            body.style.position = 'relative';
            body.style.overflow = 'visible';
            animate(body, 'top', "+40", 300);

            if (!isFixed) {
                // Body margin fix
                UMB.attach(window, 'resize', function () {
                    BrowserBar.style.width = (document.documentElement.clientWidth || document.body.clientWidth) + 'px';
                });
                BrowserBar.style.width = (document.documentElement.clientWidth || document.body.clientWidth) + 'px';
                BrowserBar.style.top = '-' + (parseFloat(getComputedVal(body, 'marginTop')) + 40) + 'px';
                BrowserBar.style.left = '-' + parseFloat(getComputedVal(body, 'marginLeft')) + 'px';
            }
        }
        if (isFixed) {
            if ((UMB.getCurrentBrowser() == 'ie' && document.compatMode == 'BackCompat')) {
                // Fixed position for Quirks mode
                UMB.attach(window, 'scroll', function () {
                    BrowserBar.style.top = ((document.documentElement.scrollTop || document.body.scrollTop) + (!BrowserBar.offsetHeight && 0)) + 'px';
                });
                BrowserBar.style.top = ((document.documentElement.scrollTop || document.body.scrollTop) + (!BrowserBar.offsetHeight && 0)) + 'px';
            } else if (UMB.getCurrentBrowser() == 'ie' && UMB.getCurrentVersion() <= 6) {
                // Fixed position IE6
                UMB.attach(window, 'resize', function () {
                    BrowserBar.style.width = (document.documentElement.clientWidth || document.body.clientWidth) + 'px';
                });
                BrowserBar.style.width = (document.documentElement.clientWidth || document.body.clientWidth) + 'px';
                var bbTop = parseFloat(getComputedVal(body, 'marginTop')) + 40;
                BrowserBar.style.top = '-' + bbTop + 'px';
                BrowserBar.style.left = '-' + parseFloat(getComputedVal(body, 'marginLeft')) + 'px';
                UMB.attach(window, 'scroll', function () {
                    BrowserBar.style.top = ((document.documentElement.scrollTop || document.body.scrollTop) - bbTop) + 'px';
                });
                BrowserBar.style.top = ((document.documentElement.scrollTop || document.body.scrollTop) - bbTop) + 'px';
            } else {
                // Fixed position
                BrowserBar.style.top = '0px';
                BrowserBar.style.position = 'fixed';
            }
        }
    };

    var hideBar = function () {
        var body = document.getElementsByTagName('body')[0];
        var BrowserBar = document.getElementById('BrowserBar');

        // Hide bar body only when BrowserBar is visible
        if (getComputedVal(BrowserBar, 'display') !== 'block') {
            return;
        }

        // Remove body class
        body.className = body.className.replace(' umb-active', '');

        // BrowserBar
        animate(BrowserBar, 'opacity', 0, 600, function () {
            BrowserBar.style.display = 'none';
        });

        // IE Quirks workaround
        if (UMB.getCurrentBrowser() == 'ie' && document.compatMode == 'BackCompat') {
        } else {
            animate(body, 'top', "-40", 300);
        }
    };

    return {

        init: function () {
            if (hasInit) {
                return;
            }
            hasInit = true;

            UMB.Widget.redraw();
        },

        redraw: function () {
            insertHtml();
            prepareHtml();
        },

        display: function () {
            UMB.Widget.init();
            showBar();
        },

        hide: function () {
            UMB.Widget.init();
            hideBar();
        },

        hidePersistent: function (days) {
            days = days || 1;
            setCookie('_umb', 'hide', days);
            UMB.hideWidget();
        }

    };
}();