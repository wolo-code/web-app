var $jscomp={scope:{}};$jscomp.defineProperty="function"==typeof Object.defineProperties?Object.defineProperty:function(a,b,c){if(c.get||c.set)throw new TypeError("ES3 does not support getters and setters.");a!=Array.prototype&&a!=Object.prototype&&(a[b]=c.value)};$jscomp.getGlobal=function(a){return"undefined"!=typeof window&&window===a?a:"undefined"!=typeof global&&null!=global?global:a};$jscomp.global=$jscomp.getGlobal(this);$jscomp.SYMBOL_PREFIX="jscomp_symbol_";
$jscomp.initSymbol=function(){$jscomp.initSymbol=function(){};$jscomp.global.Symbol||($jscomp.global.Symbol=$jscomp.Symbol)};$jscomp.symbolCounter_=0;$jscomp.Symbol=function(a){return $jscomp.SYMBOL_PREFIX+(a||"")+$jscomp.symbolCounter_++};
$jscomp.initSymbolIterator=function(){$jscomp.initSymbol();var a=$jscomp.global.Symbol.iterator;a||(a=$jscomp.global.Symbol.iterator=$jscomp.global.Symbol("iterator"));"function"!=typeof Array.prototype[a]&&$jscomp.defineProperty(Array.prototype,a,{configurable:!0,writable:!0,value:function(){return $jscomp.arrayIterator(this)}});$jscomp.initSymbolIterator=function(){}};$jscomp.arrayIterator=function(a){var b=0;return $jscomp.iteratorPrototype(function(){return b<a.length?{done:!1,value:a[b++]}:{done:!0}})};
$jscomp.iteratorPrototype=function(a){$jscomp.initSymbolIterator();a={next:a};a[$jscomp.global.Symbol.iterator]=function(){return this};return a};$jscomp.array=$jscomp.array||{};$jscomp.iteratorFromArray=function(a,b){$jscomp.initSymbolIterator();a instanceof String&&(a+="");var c=0,d={next:function(){if(c<a.length){var e=c++;return{value:b(e,a[e]),done:!1}}d.next=function(){return{done:!0,value:void 0}};return d.next()}};d[Symbol.iterator]=function(){return d};return d};
$jscomp.polyfill=function(a,b,c,d){if(b){c=$jscomp.global;a=a.split(".");for(d=0;d<a.length-1;d++){var e=a[d];e in c||(c[e]={});c=c[e]}a=a[a.length-1];d=c[a];b=b(d);b!=d&&null!=b&&$jscomp.defineProperty(c,a,{configurable:!0,writable:!0,value:b})}};$jscomp.polyfill("Array.prototype.keys",function(a){return a?a:function(){return $jscomp.iteratorFromArray(this,function(a){return a})}},"es6-impl","es3");var latLng_p="",address="",gpId="";
function getAddress(a){(new google.maps.Geocoder).geocode({location:a},function(b,c){latLng_p=a;"OK"===c?b[0]?(address=b[0].formatted_address,gpId=b[0].place_id,refreshAddress()):console.log("No geoCoding results found"):console.log("Geocoder failed due to: "+c)})}function toggleAddress(){"hide"==address_text.classList.value?showAddress():hideAddress()}function showAddress(){address_text_content.innerText=address;address_text.classList.remove("hide")}
function hideAddress(){address_text_content.innerText="";address_text.classList.add("hide")}function clearAddress(){gpId=address="";address_text_content.innerText=""}function refreshAddress(){address_text.classList.contains("hide")||(address_text_content.innerText=address)}function copyAddress(){copyNodeText(address_text_content)}function setAddress(a,b){address=a;gpId=b;refreshAddress()}var data,data_index,idLoader;
function queryPendingList(){beginLoader();firebase.database().ref("CityRequest").orderByChild("processed").equalTo(!1).on("value",function(a){data=[];data_index=0;a.forEach(function(a){var b=a.val();b.id=a.key;data.push(b)});data_count.innerText=data.length;clearTimeout(idLoader);endLoader("authenticated");updateList()})}function process_entry(a){firebase.database().ref("CityRequest/"+a).update({processed:"true"})}
function submit_city(a,b,c,d,e){var f,h=firebase.database().ref("CityList");h.once("value",function(g){f=g.val();g={center:{lat:a,lng:b},country:c,group:d,name:e};f[Object.keys(f).length]=g;h.set(f)})}var map,entryMarker,markers=[],accuCircle;
function initialize(){var a=document.getElementById("pac-input"),b=new google.maps.places.SearchBox(a),c={zoom:3,center:new google.maps.LatLng({lat:-34.397,lng:150.644}),mapTypeControl:!0,mapTypeControlOptions:{style:google.maps.MapTypeControlStyle.HORIZONTAL_BAR,position:google.maps.ControlPosition.BOTTOM_CENTER},fullscreenControl:!1,streetViewControl:!1,zoomControl:!1};map=new google.maps.Map(document.getElementById("map_canvas"),c);map.controls[google.maps.ControlPosition.TOP_LEFT].push(a);map.addListener("bounds_changed",
function(){b.setBounds(map.getBounds())});b.addListener("places_changed",function(){var a=b.getPlaces();if(0!=a.length){clearMap();var c=new google.maps.LatLngBounds;0!=a.length&&(1==a.length?focus_(a[0].geometry.location):(a.forEach(function(a){if(a.geometry){var b={url:a.icon,size:new google.maps.Size(71,71),origin:new google.maps.Point(0,0),anchor:new google.maps.Point(17,34),scaledSize:new google.maps.Size(25,25)},b=new google.maps.Marker({map:map,icon:b,title:a.name,position:a.geometry.location});
markers.push(b);a.geometry.viewport?c.union(a.geometry.viewport):c.extend(a.geometry.location)}else console.log("Returned place contains no geometry")}),map.fitBounds(c)))}});map.addListener("click",function(a){clearAddress();focus_(a.latLng)});new ClickEventHandler(map)}function clearMap(){markers.forEach(function(a){a.setMap(null)});markers=[]}
function reverseGeoCode(a){(new google.maps.Geocoder).geocode({location:{latLng:a}},function(a,c){if(c==google.maps.GeocoderStatus.OK){var b=a[0].geometry.location.lat(),e=a[0].geometry.location.lng();city_lat.innerText=b;city_lng.innerText=e;map.setCenter(a[0].geometry.location)}else console.log("Geocode error: "+c),showNotification("Oops something got wrong!")})}
function showEntryMarker(a){null!=entryMarker&&entryMarker.setMap();var b={url:"https://maps.gstatic.com/mapfiles/mobile/mobileimgs2.png",size:new google.maps.Size(22,22),origin:new google.maps.Point(0,18),anchor:new google.maps.Point(11,11)};entryMarker=new google.maps.Marker({map:map,icon:b,position:a});google.maps.event.addListener(entryMarker,"click",function(){fillForm()})}
var ClickEventHandler=function(a){this.map=a;this.placesService=new google.maps.places.PlacesService(a);this.map.addListener("click",this.handleClick.bind(this))};ClickEventHandler.prototype.handleClick=function(a){a.placeId?(a.stop(),this.getPlaceInformation(a.placeId)):getAddress(resolveLatLng(a.latLng))};ClickEventHandler.prototype.getPlaceInformation=function(a){this.placesService.getDetails({placeId:a},function(a,c){"OK"===c&&(poiPlace=a,address=a.formatted_address,refreshAddress())})};
var SPAN=.5;function ang_span_d(a){return Math.abs(Math.cos(a*Math.PI/180)/SPAN)}function getSpanBounds(a,b){var c=SPAN,d=ang_span_d(b);return{north:a+c,south:a-c,east:b+d,west:b-d}}
function focus_(a,b){map.panTo(a);city_lat.value=a.lat();city_lng.value=a.lng();"undefined"===typeof accuCircle?accuCircle=new google.maps.Rectangle({strokeColor:"#69B7CF",strokeOpacity:10,strokeWeight:1,fillColor:"#69B7CF",fillOpacity:.5,map:map,bounds:getSpanBounds(a.lat(),a.lng()),clickable:!1}):accuCircle.setBounds(getSpanBounds(a.lat(),a.lng()));"undefined"===typeof marker?(marker=new google.maps.Marker({position:a,map:map,title:"Hello World!"}),marker.addListener("click",function(){infoWindow.open(map,
marker)})):marker.setPosition(a);null==marker.getMap()&&marker.setMap(map);if("undefined"!==typeof b){if(map.fitBounds(b,26),null!=map.getBounds()){var c=map.getBounds().toSpan(),c={lat:a.lat+.06*c.lat(),lng:a.lng};map.panTo(c)}}else"undefined"!==typeof accuCircle&&accuCircle.setOptions({fillOpacity:.1})}function resolveLatLng(a){return{lat:a.lat(),lng:a.lng()}}var auth_processed=!1,map_ready=!1;window.onload=function(){initApp();setupControls()};
function initApp(){firebase.auth().getRedirectResult().then(function(a){a.credential?queryPendingList():firebase.auth().currentUser?queryPendingList():(showRestrictedBlock(),a=new firebase.auth.GoogleAuthProvider,firebase.auth().signInWithRedirect(a))})["catch"](function(a){})}function beginLoader(){idLoader=setTimeout(function(){endLoader("unauthenticated")},2500)}function endLoader(a){"authenticated"==a?showConsloeBlock():showRestrictedBlock()}
function initMap(){auth_processed?initialize():map_processed=!0}function showRestrictedBlock(){console_block.classList.add("hide");restrict_block.classList.remove("hide")}function showConsloeBlock(){restrict_block.classList.add("hide");console_block.classList.remove("hide");map_processed?initialize():auth_processed=!0}function nextRow(){data_index+1<data.length&&(data_index++,updateList())}function deleteRow(){}
function previousRow(){0==data_index?0<data.length&&(data_index=data.length-1,updateList()):(data_index--,updateList())}function updateList(){if(0<data.length){view_data_index.innerText=data_index+1;var a=data[data_index];setAddress(a.address,a.gp_id);data_time.innerText=formatDate(new Date(a.time));location_request_list.classList.remove("invisible");map.panTo(a.lat_lng);showEntryMarker(a.lat_lng)}else location_request_list.classList.add("invisible")}
function setupControls(){data_previous.addEventListener("click",function(a){previousRow()});data_reject.addEventListener("click",function(a){process_entry(data[data_index].id);deleteRow()});data_next.addEventListener("click",function(a){nextRow()});data_process_checkbox.addEventListener("change",function(){if(this.checked){var a=data[data_index];map.panTo(a.lat_lng);showEntryMarker(a.lat_lng)}});submit_city_button.addEventListener("click",function(){city_submit_panel.checkValidity()&&(submit_city(city_lat.value,
city_lng.value,city_country.value,city_group.value,city_name.value),data_process_checkbox.checked&&process_entry(data[data_index].id))})}function formatDate(a){var b=a.getDate(),c=a.getMonth(),d=a.getFullYear(),e=a.getHours();a=a.getMinutes();return b+" "+"Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ")[c]+" "+d+" "+e+":"+a}
function fillForm(){var a=data[data_index];city_lat.value=a.lat_lng.lat;city_lng.value=a.lat_lng.lng;city_country.value=a.address.split(" ").pop();address_text_content.innerText=a.address};
