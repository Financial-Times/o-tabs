/*global module, require*/
const oDom = require('o-dom');

function Tabs(rootEl, config) {

	const tabsObj = this;
	let tabEls;
	let tabpanelEls;
	let updateUrl = (rootEl.getAttribute('data-o-tabs-update-url') !== null);
	let selectedTabIndex = -1;

	function getTabTargetId(tabEl) {
		const aEls = tabEl.getElementsByTagName('a');
		return (aEls && aEls[0]) ? aEls[0].getAttribute('href').replace('#','') : '';
	}

	function getTabPanelEls(tabEls) {
		const els = [];
		let targetEl;
		let c;
		let l;
		for (c = 0, l = tabEls.length; c < l; c++) {
			const tabTargetId = getTabTargetId(tabEls[c]);
			targetEl = document.getElementById(tabTargetId);

			if (targetEl) {
				tabEls[c].setAttribute('aria-controls', tabTargetId);
				tabEls[c].setAttribute('tabindex', '0');

				const label = tabEls[c].getElementsByTagName('a')[0];
				const labelId = tabTargetId + '-label';
				label.setAttribute('tabindex', '-1');
				label.id = labelId;
				targetEl.setAttribute('aria-labelledby', labelId);
				targetEl.setAttribute('role', 'tabpanel');
				targetEl.setAttribute('tabindex', '0');
				els[c] = targetEl;
			}
		}
		return els;
	}

	function getTabElementFromHash(){
		const tabLink = rootEl.querySelector(`[href="${location.hash}"]`);
		return tabLink && tabLink.parentNode ? tabLink.parentNode : null;
	}

	function getTabIndexFromElement(el) {
		return oDom.getIndex(el);
	}

	function getSelectedTabElement(){
		return rootEl.querySelector('[aria-selected=true]');
	}

	function getSelectedTabIndex() {
		const selectedTabElement = updateUrl && location.hash ? getTabElementFromHash() : getSelectedTabElement();
		return selectedTabElement ? getTabIndexFromElement(selectedTabElement) : 0;
	}

	function isValidTab(i) {
		return (!isNaN(i) && i >= 0 && i < tabEls.length);
	}

	function hidePanel(panelEl) {
		panelEl.setAttribute('aria-expanded', 'false');
		panelEl.setAttribute('aria-hidden', 'true');
	}

	function showPanel(panelEl, disableFocus) {
		panelEl.setAttribute('aria-expanded', 'true');
		panelEl.setAttribute('aria-hidden', 'false');

		// Remove the focus ring for sighted users
		panelEl.style.outline = 0;

		if (disableFocus){
			return;
		}

		// update the url to match the selected tab
		if(panelEl.id && updateUrl){
			location.href = '#' + panelEl.id;
		}

		// Get current scroll position
		const x = window.scrollX || window.pageXOffset;
		const y = window.scrollY || window.pageYOffset;

		// Give focus to the panel for screen readers
		// This might cause the browser to scroll up or down
		panelEl.focus();

		// Scroll back to the original position
		window.scrollTo(x, y);
	}

	function dispatchCustomEvent(event, data = {}, namespace = 'oTabs') {
		rootEl.dispatchEvent(new CustomEvent(namespace + '.' + event, {
			detail: data,
			bubbles: true
		}));
	}

	function selectTab(i) {
		let c;
		let l;
		if (isValidTab(i) && i !== selectedTabIndex) {
			for (c = 0, l = tabEls.length; c < l; c++) {
				if (i === c) {
					tabEls[c].setAttribute('aria-selected', 'true');
					showPanel(tabpanelEls[c], tabsObj.config.disablefocus);
				} else {
					tabEls[c].setAttribute('aria-selected', 'false');
					hidePanel(tabpanelEls[c]);
				}
			}
			dispatchCustomEvent('tabSelect', {
				tabs: tabsObj,
				selected: i,
				lastSelected: selectedTabIndex
			});
			selectedTabIndex = i;
		}
	}

	function clickHandler(ev) {
		ev.preventDefault();
		const tabEl = oDom.getClosestMatch(ev.target, '[role=tab]');
		if (tabEl) {
			updateCurrentTab(tabEl);
		}
	}

	function keyPressHandler(ev) {
		ev.preventDefault();
		const tabEl = oDom.getClosestMatch(ev.target, '[role=tab]');
		// Only update if key pressed is enter key
		if (tabEl && ev.keyCode === 13) {
			updateCurrentTab(tabEl);
		}
	}

	function hashChangeHandler() {
		if(!updateUrl){
			return;
		}

		const tabEl = getTabElementFromHash();
		if(tabEl){
			updateCurrentTab(tabEl);
		}
	}

	function updateCurrentTab(tabEl){
		const i = getTabIndexFromElement(tabEl);
		tabsObj.selectTab(i);
		dispatchCustomEvent('event', {
			category: 'tabs',
			action: 'click',
			tab: tabEl.textContent
		}, 'oTracking');
	}

	function init() {
		if (!rootEl) {
			rootEl = document.body;
		} else if (!(rootEl instanceof HTMLElement)) {
			rootEl = document.querySelector(rootEl);
		}
		tabEls = rootEl.querySelectorAll('[role=tab]');
		tabpanelEls = getTabPanelEls(tabEls);
		rootEl.setAttribute('data-o-tabs--js', '');
		rootEl.addEventListener('click', clickHandler, false);
		rootEl.addEventListener('keypress', keyPressHandler, false);
		window.addEventListener('hashchange', hashChangeHandler, false);

		if (!config) {
			config = {};
			Array.prototype.forEach.call(rootEl.attributes, function(attr) {
				if (attr.name.indexOf('data-o-tabs') === 0) {
					// Remove the unnecessary part of the string the first time this is run for each attribute
					const key = attr.name.replace('data-o-tabs-', '');
					try {
						// If it's a JSON, a boolean or a number, we want it stored like that, and not as a string
						// We also replace all ' with " so JSON strings are parsed correctly
						config[key] = JSON.parse(attr.value.replace(/\'/g, '"'));
					} catch (e) {
						config[key] = attr.value;
					}
				}
			});
		}

		tabsObj.config = config;
		dispatchCustomEvent('ready', {
			tabs: tabsObj
		});
		tabsObj.selectTab(getSelectedTabIndex());
	}

	function destroy() {
		rootEl.removeEventListener('click', clickHandler, false);
		window.removeEventListener('hashchange', hashChangeHandler, false);
		rootEl.removeAttribute('data-o-tabs--js');
		for (let c = 0, l = tabpanelEls.length; c < l; c++) {
			showPanel(tabpanelEls[c]);
		}
	}

	this.selectTab = selectTab;
	this.destroy = destroy;

	init();
}

Tabs.init = function(el, config) {
	const tabs = [];
	let tEls;
	let c;
	let l;
	if (!el) {
		el = document.body;
	} else if (!(el instanceof HTMLElement)) {
		el = document.querySelector(el);
	}
	if (el.querySelectorAll) {
		tEls = el.querySelectorAll('[data-o-component=o-tabs]');
		for (c = 0, l = tEls.length; c < l; c++) {
			if (!tEls[c].matches('[data-o-tabs-autoconstruct=false]') && !tEls[c].hasAttribute('data-o-tabs--js')) {
				tabs.push(new Tabs(tEls[c], config));
			}
		}
	}
	return tabs;
};

module.exports = Tabs;
