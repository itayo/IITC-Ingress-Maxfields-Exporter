// ==UserScript==
// @id iitc-plugin-ingressmaxfield@stenyg
// @name IITC plugin: Ingress Maxfields
// @category Information
// @version 0.1.4.4
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
function wrapper() {
	// in case IITC is not available yet, define the base plugin object
	if (typeof window.plugin !== "function") {
		window.plugin = function() {};
	}
	// base context for plugin

	window.plugin.ingressmaxfield = function() {};
	var self = window.plugin.ingressmaxfield;
	// custom dialog wrapper with more flexibility
	self.tooManyWait = function tooManyWait() {
		alert("Too many portals found, only listing 50");
	};
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

		for (var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i) {
			((poly[i].lat <= pt.lat && pt.lat < poly[j].lat) || (poly[j].lat <= pt.lat && pt.lat < poly[i].lat)) && (pt.lng < (poly[j].lng - poly[i].lng) * (pt.lat - poly[i].lat) / (poly[j].lat - poly[i].lat) + poly[i].lng) && (c = !c);
		}
		return c;
	};

	// return if the portal is within the drawtool objects.
	// Polygon and circles are available, and circles are implemented
	// as round polygons.
	self.portalInDrawnItems = function(portal) {
		var c = false;

		window.plugin.drawTools.drawnItems.eachLayer(function(layer) {
			if (!(layer instanceof L.GeodesicPolygon || layer instanceof L.Rectangle || layer instanceof L.GeodesicCircle || layer instanceof L.Circle)) {
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
	}
	self.genStr = function genStr(p,x) {
		var href = "https://www.ingress.com/intel?ll=" + p._latlng.lat + "," + p._latlng.lng + "&z=17&pll=" + p._latlng.lat + "," + p._latlng.lng;
		var str = p.options.data.title;
		str = str.replace(/\"/g, "\\\"");
		str = str.replace(";"," ");
		if (window.plugin.keys && (typeof window.portals[x] !== "undefined")) {
			var keyCount = window.plugin.keys.keys[x] || 0;
			str = str + ";" +href +";" + keyCount;
		} else {
			str = str + ";" + href;
		}
		return str;
	}

	self.checkPortals= function checkPortals(portals) {
		var count=0;
		var obj = {
			list:[],
			tooMany:false
			};
		for (var x in portals) {
			if (typeof window.portals[x] !== "undefined" && count < 50) {
                    if(self.inBounds(window.portals[x]))
                    {
                        var str= self.genStr(window.portals[x],x);
                        obj.list.push(str);
                        count=count + 1;
                    }
			}
		}
		obj.tooMany = count < 50?false:true;
		return obj;


	}
	self.showDialog = function showDialog(o,tooMany)
	{
		var data = "<span>Save the data in a textfile or post it on ingress-maxfields.com.</span>";
		data = data + "<form name=\"maxfield\" action=\"http://ingress-maxfield.com/submit.php\" enctype=\"multipart/form-data\" method=\"post\" target=\"_blank\">";
		data = data + "<textarea name=\"portal_list_area\" id=\"upload\" rows=\"30\" style=\"width: 100%;\">" + o.join("\n") + "</textarea>";
		data = data + "<p>Number of agents:<input type=\"number\" class=\"num_agents\" name=\"num_agents\" value=\"1\" min=\"1\" required></p>";
		data = data + "<p>Use Google maps<input type=\"checkbox\" name=\"useGoogle\" value=\"YES\" checked>";
		data = data + "<input type=\"hidden\" name=\"email\" placeholder=\"(optional)\"></p><p><input type=\"submit\" class=\"submit\" name=\"submit\" value=\"Submit!\">";
		data = data + "</p></form>";
		var dia = window
			.dialog({
				title: "www.ingress-maxfield.com: Field your future",
					html: data
				}).parent();
			$(".ui-dialog-buttonpane", dialog).remove();
			dia.css("width", "600px").css("top",
				($(window).height() - dia.height()) / 2).css("left",
				($(window).width() - dia.width()) / 2);
			if (tooMany) {
				alert("Too many portals visible, only showing 50!");
			}
		return dia;
	}

	self.gen = function gen() {
		var o = self.checkPortals(window.portals);
		var dialog = self.showDialog(o.list,o.tooMany);
		return dialog;
	}

// setup function called by IITC
	self.setup = function init() {
			// add controls to toolbox
			var link = $("<a onclick=\"window.plugin.ingressmaxfield.gen();\" title=\"Generate a CSV list of portals and locations for use with www.ingress-maxfield.com.\">IMF Export</a>");
			$("#toolbox").append(link);
			// delete self to ensure init can't be run again
			delete self.init;
		}
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

