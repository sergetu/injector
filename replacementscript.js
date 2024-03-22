(() => {
	const State = Object.freeze({
		Default: 0,
		Open: 1,
		Closing: 2,
		Closed: 3,
		Reopening: 4
	});

	ACTION_HUB = {
		State,
		RADIUS: 90,
		OFFSET: 80,
		TENSION: 1,
		flipXPosition: function (i) {
			switch (i) {
				case 0:
					return 6;
				case 1:
					return 5;
				case 2:
					return 4;
				case 6:
					return 0;
				case 5:
					return 1;
				case 4:
					return 2;
				default:
					return i;
			}
		}
	};
})();

ACTION_HUB.ActionHub = function (_x, _y, ...args) {
	const [_nature, _flip] = args;
	const _actions = args[2].filter(o => o);

	const _parent = document.getElementById("actions");
	const _elm = document.createElement("div");
	const _center = document.createElement("div");
	const _ul = document.createElement("ul");
	const _nestedActions = [];

	let _list;

	let _actionHub = this;
	let _progress = 0;
	let _start = 0;

	let _state = ACTION_HUB.State.Default;

	_elm.className = `${_nature} inactive`;
	_center.className = "center";

	_center.onclick = () => {
		_center.classList.add("selected");
		_nestedActions.pop();
		_actionHub.Reopen();
	};

	const updateActions = function () {
		const actions = _nestedActions.length > 0 ? _nestedActions[_nestedActions.length - 1] : _actions;
		
		_center.classList.toggle("back", _nestedActions.length > 0);

		clearHTML(_ul);
		_center.classList.remove("selected");

		for (const action of actions) {
			const li = document.createElement("li");
			console.log(action);
			if (!action) {
				li.className = "inactive";
			}
			else {
				li.textContent = getString(action.label);

				switch (action.cost) {
					case ACTION.Cost.Action:
						li.className = "star";
						break;
					case ACTION.Cost.Spell:
						li.className = "spell";
						break;
					case ACTION.Cost.SpecialAction:
						li.className = "special star";
						break;
					case ACTION.Cost.SpecialSpell:
						li.className = "special spell";
						break;
				}

				if (!action.enabled) {
					li.classList.add("disabled");
				}
				else if (Array.isArray(action.event)) {
					li.onclick = () => {
						if (_state == ACTION_HUB.State.Open) {
							li.classList.add("selected");
							_nestedActions.push(action.event);
							_actionHub.Reopen();
						}
					};
				}
				else {
					li.onclick = () => {
						if (_state == ACTION_HUB.State.Open) {
							li.classList.add("selected");
							_actionHub.Close();
							action.event ? action.event(action) : null;
						}
					};
				}
			}

			_ul.appendChild(li);
		}

		_list = _ul.getElementsByTagName("li");
	}

	_elm.appendChild(_center);
	_elm.appendChild(_ul);

	{
		const rect = _parent.getBoundingClientRect();
		_x = (_x - rect.x) * 900 / container.offsetHeight;
		_y = (_y - rect.y) * 900 / container.offsetHeight;
	};

	this.Close = async function () {
		if (_state !== ACTION_HUB.State.Open) {
			return;
		}

		_state = ACTION_HUB.State.Closing;
		_start = Date.now();
		_progress = 0;

		_elm.classList.add("inactive");
		await waitUntil(() => _progress >= 1);

		if (_elm.parentNode) {
			_elm.parentNode.removeChild(_elm);
		}

		_state = ACTION_HUB.State.Closed;
		return true;
	}

	this.Reopen = async function () {
		_state = ACTION_HUB.State.Reopening;
		_start = Date.now();
		_progress = 0;

		_elm.classList.add("inactive");
		_elm.classList.add("reopen");
		await transitionEnded(_elm);

		await _actionHub.Open();
		_elm.classList.remove("reopen");
	}

	this.Open = async function () {
		_parent.appendChild(_elm);

		updateActions();

		_state = ACTION_HUB.State.Default;
		_start = Date.now();
		_progress = 0;

		await waitForFrames();
		_elm.classList.remove("inactive");
		await transitionEnded(_elm);
		_state = ACTION_HUB.State.Open;
	}

	this.Update = function (now) {
		if (!_elm.parentNode) {
			return;
		}

		const closing = _state == ACTION_HUB.State.Closing || _state == ACTION_HUB.State.Reopening;
		let scale = container.offsetHeight / 900;
		_elm.style.left = `${_x * scale}px`;
		_elm.style.top = `${_y * scale}px`;

		const offset = ACTION_HUB.OFFSET * scale;
		const radius = ACTION_HUB.RADIUS * scale;

		_progress = Math.min(1, (now - _start) / (closing ? 250 : 300));

		scale = closing ? (1 - _progress) - 1 : _progress - 1;
		scale = scale * scale * ((ACTION_HUB.TENSION + 1) * scale + ACTION_HUB.TENSION) + 1;

		for (let i = 0; i < _list.length; i++) {
			const li = _list[i];

			const width = li.offsetWidth;
			let position = _list.length == 1 ? 1 : i;

			if (_flip) {
				position = ACTION_HUB.flipXPosition(position);
			}

			switch (position) {
				case 0:
				case 2:
				case 4:
				case 6:
					if (position < 4) {
						li.style.left = `${Math.sqrt(radius * radius - offset * offset) * scale}px`;
					}
					else {
						li.style.left = `${- Math.sqrt(radius * radius - offset * offset) * scale - width}px`;
					}
					li.style.top = `${offset * (position % 6 == 0 ? -1 : 1) * scale}px`;
					break;
				case 1:
					li.style.left = `${radius * scale}px`;
					break;
				case 5:
					li.style.left = `${- radius * scale - width}px`;
					break;
				case 3:
					li.style.top = `${offset * 2 * scale}px`;
					break;
				case 7:
					li.style.top = `${- offset * 2 * scale}px`;
					break;
				default:
					li.style.display = "none";
					break;
			}
		}
	}

	this.IsClosing = () => _state == ACTION_HUB.State.Closing;

	this.IsClosed = () => _state == ACTION_HUB.State.Closed;

	this.Open();
}
