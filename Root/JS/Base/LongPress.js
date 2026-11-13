var listPressTimer = [];

var cancel = function(e) {
	if (this.presstimer !== null) {
		clearTimeout(this.presstimer);
		listPressTimer[this.pressTimerIndex] = this.presstimer = null;
	}

	if(this.classList)
		this.classList.remove('longpress');
};

var click = function(e) {
	if (this.presstimer !== null) {
		clearTimeout(this.presstimer);
		listPressTimer[this.pressTimerIndex] = this.presstimer = null;
	}

	if(this.classList)
		this.classList.remove('longpress');

	if (this.longpress && e.detail !== 0) {
		this.longpress = false;
		return false;
	}

	this.fnShort(e);
};

var start = function(e) {

	if (e.button !== 0 || e.isPrimary === false) {
		return;
	}

	this.longpress = false;

	if(this.classList)
		this.classList.add('longpress');

	var parent = this;
	if (this.presstimer === null) {
		listPressTimer[this.pressTimerIndex] = this.presstimer = setTimeout(function() {
			parent.longpress = true;
			parent.fnLong(e);
		}, 500);
	}

	return false;
};

function addLongpressListener(node, fnShort, fnLong) {
	if(!node || !node.addEventListener)
		return;
	node.addEventListener('pointerdown', start);
	node.addEventListener('click', click);
	node.addEventListener('pointerup', cancel);
	node.addEventListener('pointerleave', cancel);
	node.addEventListener('pointercancel', cancel);
	node.addEventListener('contextmenu', function(event) {
		if(event.pointerType === 'touch' || this.longpress)
			event.preventDefault();
	});
	node.longpress = false;
	node.presstimer = null;
	node.longtarget = null;
	node.fnShort = fnShort;
	node.fnLong = fnLong;
	node.pressTimerIndex = listPressTimer.length;
}
