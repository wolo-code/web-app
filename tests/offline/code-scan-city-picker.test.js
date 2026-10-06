const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('zoom reset indicator follows zoom changes and clears on reset', () => {
 const level = {}, reset = { classList: { toggle(name, visible) { this.visible = visible; } } };
 const context = { Audio: function() { this.load = () => {}; }, document: {
  getElementById: id => ({ code_scan_zoom_level: level, code_scan_zoom_reset: reset })[id]
 } };
 vm.createContext(context);
 vm.runInContext(fs.readFileSync('Root/JS/Component/Root/CodeScan.js', 'utf8'), context);
 context.getCodeScanCanvas = () => null;
 context.clampCodeScanPan = () => {};
 context.setCodeScanZoom(1);
 assert.equal(reset.classList.visible, false);
 context.setCodeScanZoom(1.5);
 assert.equal(level.textContent, '150%');
 assert.equal(reset.classList.visible, true);
 context.resetCodeScanZoom();
 assert.equal(level.textContent, '100%');
 assert.equal(reset.classList.visible, false);
});

test('scanner city picker deduplicates choices and updates only the review city', () => {
 function element() {
  const classes = new Set(['hide']);
  return { children: [], attributes: {}, value: '',
   classList: { add: x => classes.add(x), contains: x => classes.has(x),
    toggle: (x, on) => on ? classes.add(x) : classes.delete(x) },
   setAttribute(k, v) { this.attributes[k] = v; },
   addEventListener(k, fn) { this[k] = fn; },
   appendChild(child) { this.children.push(child); },
   get firstElementChild() { return this.children[0]; },
   set innerHTML(value) { this.children = []; },
   focus() { this.focused = true; }
  };
 }
 const choices = element(), toggle = element(), input = element();
 const nodes = { code_scan_city_choices: choices, code_scan_city_select: toggle, code_scan_review_city: input };
 const context = { Audio: function() { this.load = () => {}; },
  document: { getElementById: id => nodes[id], createElement: element },
  decode_city_history: [{ name: 'Delhi' }, { name: 'Mumbai' }],
  selected_decode_city: { name: 'Delhi' }, geoIp_city_name: 'Mumbai' };
 vm.createContext(context);
 vm.runInContext(fs.readFileSync('Root/JS/Component/Root/CodeScan.js', 'utf8'), context);
 let validated = false;
 context.updateCodeScanReviewValidity = () => { validated = true; };
 context.populateCodeScanCityChoices('Delhi');
 assert.deepEqual(choices.children.map(x => x.textContent), ['Delhi', 'Mumbai']);
 context.toggleCodeScanCityChoices();
 assert.equal(toggle.attributes['aria-expanded'], 'true');
 assert.equal(choices.children[0].focused, true);
 choices.children[1].click({ currentTarget: choices.children[1] });
 assert.equal(input.value, 'Mumbai');
 assert.equal(context.selected_decode_city.name, 'Delhi');
 assert.equal(toggle.attributes['aria-expanded'], 'false');
 assert.equal(choices.classList.contains('hide'), true);
 assert.equal(toggle.focused, true);
 assert.equal(validated, true);
});
