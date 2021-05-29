var listPressTimer = [];

var cancel = function(e) {
	if (this.presstimer !== null) {
		clearTimeout(this.presstimer);
		listPressTimer[this.pressTimerIndex] = this.presstimer = null;
	}

	this.classList.remove('longpress');
};

var click = function(e) {
	if (this.presstimer !== null) {
		clearTimeout(this.presstimer);
		listPressTimer[this.pressTimerIndex] = this.presstimer = null;
	}

	this.classList.remove('longpress');

	if (this.longpress) {
		return false;
	}

	this.fnShort(e);
};

var start = function(e) {

	if (e.type === 'click' && e.button !== 0) {
		return;
	}

	this.longpress = false;

	this.classList.add('longpress');

	var parent = this;
	if (this.presstimer === null) {
		listPressTimer[this.pressTimerIndex] = this.presstimer = setTimeout(function() {
			parent.fnLong(e);
			parent.longpress = true;
		}, 500);
	}

	return false;
};

function addLongpressListener(node, fnShort, fnLong) {
	node.addEventListener('mousedown', start);
	node.addEventListener('touchstart', start);
	node.addEventListener('click', click);
	node.addEventListener('mouseout', cancel);
	node.addEventListener('touchend', cancel);
	node.addEventListener('touchleave', cancel);
	node.addEventListener('touchcancel', cancel);
	node.longpress = false;
	node.presstimer = null;
	node.longtarget = null;
	node.fnShort = fnShort;
	node.fnLong = fnLong;
	node.pressTimerIndex = listPressTimer.length;
}
