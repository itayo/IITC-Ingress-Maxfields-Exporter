// ==UserScript==
// @id iitc-plugin-ingressmaxfield@stenyg
// @name IITC plugin: Ingress Maxfields
// @category Information
// @version 0.1.6.3
// @namespace http://github.com/jonatkins/ingress-intel-total-conversion
// @updateURL http://github.com/itayo/IITC-Ingress-Maxfields-Exporter/raw/master/IngressMaxFields.user.js
// @downloadURL http://github.com/itayo/IITC-Ingress-Maxfields-Exporter/raw/master/IngressMaxFields.user.js
// @description Exports portals in the format for http://www.ingress-maxfield.com/ and allow direct transfer to site
// @include https://www.ingress.com/intel*
// @include http://www.ingress.com/intel*
// @match https://www.ingress.com/intel*
// @match http://www.ingress.com/intel*
// @grant none
// ==/UserScript==
/*global $:false */
/*global map:false */
/*global L:false */
function wrapper() {
    // in case IITC is not available yet, define the base plugin object
    if (typeof window.plugin !== "function") {
        window.plugin = function() {};
    }
    // base context for plugin

    window.plugin.ingressmaxfield = function() {};
    var self = window.plugin.ingressmaxfield;
    // custom dialog wrapper with more flexibility
    self.sleep = function sleep(milliseconds) {
        var start = new Date().getTime();
        for (var i = 0; i < 1e7; i++) {
            if ((new Date().getTime() - start) > milliseconds) {
                break;
            }
        }
    };

    self.portalInScreen = function portalInScreen(p) {
        return map.getBounds().contains(p.getLatLng());
    };

    //  adapted from
    //+ Jonas Raoni Soares Silva
    //@ http://jsfromhell.com/math/is-point-in-poly [rev. #0]
    self.portalInPolygon = function portalInPolygon(polygon, portal) {
        var poly = polygon.getLatLngs();
        var pt = portal.getLatLng();
        var c = false;
        for (var i = -1, l = poly.length, j = l - 1; ++i < l; j = i) {
            ((poly[i].lat <= pt.lat && pt.lat < poly[j].lat) || (poly[j].lat <= pt.lat && pt.lat < poly[i].lat)) && (pt.lng < (poly[j].lng - poly[i].lng) * (pt.lat - poly[i].lat) / (poly[j].lat - poly[i].lat) + poly[i].lng) && (c = !c);
        }
        return c;
    };

    // return if the portal is within the drawtool objects.
    // Polygon and circles are available, and circles are implemented
    // as round polygons.
    self.portalInForm = function(layer) {
        if (layer instanceof L.Rectangle) {
            return true;
        }
        if (layer instanceof L.Circle) {
            return true;
        }
        return false;
    };

    self.portalInGeo = function(layer) {
        if (layer instanceof L.GeodesicPolygon) {
            return true;
        }
        if (layer instanceof L.GeodesicCircle) {
            return true;
        }
        return false;
    };

    self.portalInDrawnItems = function(portal) {
        var c = false;

        window.plugin.drawTools.drawnItems.eachLayer(function(layer) {
            if (!(self.portalInForm(layer) || self.portalInGeo(layer))) {
                return false;
            }

            if (self.portalInPolygon(layer, portal)) {
                c = true;
            }
        });
        return c;
    };
    self.inBounds = function(portal) {
        if (window.plugin.drawTools && window.plugin.drawTools.drawnItems.getLayers().length) {
            return self.portalInDrawnItems(portal);
        } else {
            return self.portalInScreen(portal);
        }
    };
    self.genStr = function genStr(p, x) {
        var href = "https://www.ingress.com/intel?ll=" + p._latlng.lat + "," + p._latlng.lng + "&z=17&pll=" + p._latlng.lat + "," + p._latlng.lng;
	var str= "";
        str = p.options.data.title || "untitled portal";
	str = str.replace(/\"/g, "\\\"");
        str = str.replace(";", " ");
        str = str + ";" + href;
        if (window.plugin.keys && (typeof window.portals[x] !== "undefined")) {
		var keyCount =window.plugin.keys.keys[x] || 0;
		str = str + ";" + keyCount;
	}
	return str;
    };

    self.managePortals = function managePortals(obj, portal, x) {
        if (self.inBounds(portal)) {
            var str = self.genStr(portal, x);
            obj.list.push(str);
            obj.count += 1;
        }
        return obj;

    };
    self.checkPortals = function checkPortals(portals) {
        var obj = {
            list: [],
            count: 0
        };
        for (var x in portals) {
            if (typeof window.portals[x] !== "undefined") {
                self.managePortals(obj, window.portals[x], x);
            }
        }
        return obj;


    };
    self.showDialog = function showDialog(o) {
	var data = "";
	data += "<form name='maxfield' action='http://www.ingress-maxfield.com/submit.php' enctype='multipart/form-data' method='post' target=\"_blank\">";
	data += "<div id='form_area'>";
	data += "    <textarea class='form_area' name='portal_list_area' rows='30' cols='70' placeholder='Copy and paste portal list here OR upload portal list 	file below. Proper formatting guidelines can be found in the instructions. Anything after a # is considered a comment and will be ignored - be sure to remove any # or ; that appear in a portal name. Each portal should start on a new line.'>" + o.join("\n") + "</textarea>";
	data += "</div>";
	data += "<div id='form_part2'>";
	data += "<div id='file_upload'>";
	data += "  <br/>";
	data += "  <label class='upload_button' hidden><span><input id='hidden' type='file' name='portal_list'></span></label><input type='hidden' id='path' placeholder='No file selected' disabled>";
	data += "</div>";
	data += "<div id='num_agents'>";
	data += "    <table width='100%'>";
	data += "    <tr><td width='50%'>Number of agents:</td><td width='50%'><input type='number' class='num_agents' name='num_agents' value='1' min='1' required></td></tr>";
	data += "    <tr><td>Use Google Maps?</td><td><input type='checkbox' name='useGoogle' value='YES' checked></td></tr>";
	data += "    <tr><td>Color scheme</td><td><input type='radio' name='color' value='ENL' checked>ENL</input><input type='radio' name='color' value='RES'>RES</input></td></tr>";
	data += "    </table>";
	data += "</div>";
	data += "<div id='submit'>";
	data += "    <table>";
	data += "						<tr><td>Email:</td><td><input type='email' name='email' placeholder='(optional)'></td></tr>";
	data += "    <tr><td></td><td><input type='submit' class='submit' name='submit' value='Submit!'></td></tr>";
	data += "    </table>";
	data += "</div>";
	data += "</div>";
	data += "</form>";
        var dia = window.dialog({
                title: "www.ingress-maxfield.com: Field your future",
                html: data
            }).parent();
        $(".ui-dialog-buttonpane", dia).remove();
        dia.css("width", "600px").css("top", ($(window).height() - dia.height()) / 2).css("left", ($(window).width() - dia.width()) / 2);
        return dia;
    };

    self.gen = function gen() {
        var o = self.checkPortals(window.portals);
        var dialog = self.showDialog(o.list);
        return dialog;
    };

    // setup function called by IITC
    self.setup = function init() {
        // add controls to toolbox
        var link = $("<a onclick=\"window.plugin.ingressmaxfield.gen();\" title=\"Generate a CSV list of portals and locations for use with www.ingress-maxfield.com.\">IMF Export</a>");
        $("#toolbox").append(link);
        // delete self to ensure init can't be run again
        delete self.init;
    };
    // IITC plugin setup
    if (window.iitcLoaded && typeof self.setup === "function") {
        self.setup();
    } else if (window.bootPlugins) {
        window.bootPlugins.push(self.setup);
    } else {
        window.bootPlugins = [self.setup];
    }
}
// inject plugin into page
var script = document.createElement("script");
script.appendChild(document.createTextNode("(" + wrapper + ")();"));
(document.body || document.head || document.documentElement)
.appendChild(script);
