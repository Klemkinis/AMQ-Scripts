// ==UserScript==
// @name         AMQ Expand Library
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Makes it more ugly and efficient
// @author       Juvian
// @match        https://animemusicquiz.com/*
// @grant        none
// @require      https://gist.githubusercontent.com/arantius/3123124/raw/grant-none-shim.js

// ==/UserScript==

if (!window.ExpandQuestionList) return;

ExpandQuestionList.prototype.updateQuestionList = function (questions) {
	this.clear();
	this.animeEntries = questions.map((entry) => { return new ExpandQuestionListEntry(entry, this); });

	let entries = new WeakMap();

	this.animeEntries.forEach(function(entry){
		entry.$songContainer.detach();
		entries.set(entry.$animeEntry[0], entry);
	})

	this._$questionList.off().on("click", ".elQuestionAnime", (ev) => {
	    let entry = entries.get(ev.currentTarget);
		if (entry.open) {
			$(ev.currentTarget).parent().append(entry.$songContainer);
		} else {
			entry.$songContainer.detach();
		}
	});

	this._$questionList.append(
		this.animeEntries
		    .sort((a, b) => { return a.name.localeCompare(b.name); })
		    .map(entry => entry.$body)
	 )
	.append(this._LIST_FILLER_HTML)
	.prepend(this._LIST_FILLER_HTML);

	this.topShownQuestionIndex = 0;
	this._QUERY_UPDATE_CHUNK_SiZE = 1000;

	this._$questionList.perfectScrollbar('destroy');
	this._$questionList.attr("style", "overflow-y: scroll !important");

	document.getElementById('elQuestionList').style.setProperty('height', '60%');
	document.getElementById('elQuestionList').style.setProperty('top', '5%');
};

var isLastSearchFullyFinished = true
ExpandQuestionList.prototype.applySearchFilter = function (query) {
	this._$searchSpinner.removeClass('hide');
	this._currentSearchId++;
	let searchId = this._currentSearchId;

	let applyQueryFunction;

	if (query) {
		let regexQuery = new RegExp(createAnimeSearchRegexQuery(query), 'i');
		let stricterQuery = isLastSearchFullyFinished ? this.lastSearchRegex.test(query) : null;
		this.lastSearchRegex = regexQuery;
		applyQueryFunction = (entry) => {
			entry.applySearchFilter(regexQuery, stricterQuery);
		};
	} else {
		this.lastSearchRegex = /^$/;
		applyQueryFunction = (entry) => {
			entry.resetSearchFilter();
		};
	}

	let updateFunction = (currentIndex) => {
		if (this._currentSearchId !== searchId) {
			return;
		}
		for (let i = currentIndex; i < currentIndex + this._QUERY_UPDATE_CHUNK_SiZE && i < this.animeEntries.length; i++) {
			applyQueryFunction(this.animeEntries[i]);
		}

		let nextIndex = currentIndex + this._QUERY_UPDATE_CHUNK_SiZE;
		if (nextIndex < this.animeEntries.length) {
			setTimeout(function () {
				updateFunction(nextIndex);
			}.bind(this), 1);
		} else {
			this.updateScrollLayout();
			this._$searchSpinner.addClass('hide');
			isLastSearchFullyFinished = true
		}
	};

	isLastSearchFullyFinished = false
	updateFunction(0);
};

ExpandQuestionSongEntry.prototype.applySearchFilter = function (regex, stricter) {
	if (stricter && !this.inSearch) {
		return false
	}

	var isCurrentlyVisible = this.inSearch
	var shouldBeVisible = regex.test(this.name) || regex.test(this.artist)

	if (isCurrentlyVisible == shouldBeVisible) {
		return shouldBeVisible
	}

	this.inSearch = shouldBeVisible
	this.updateDisplay()
}

ExpandQuestionListEntry.prototype.updateDisplay = function () {
	var isCurrentlyVisible = this.active
	var shouldBeVisible = this.songList.some(entry => { return entry.isActive() })

	if (isCurrentlyVisible == shouldBeVisible) {
		return
	}

	this.active = shouldBeVisible

	if (this.active) {
		this.$body.removeClass('hide')
	} else {
		this.$body.addClass('hide')
	}
}

ExpandQuestionList.prototype.updateScrollLayout = function () {}


GM_addStyle(`
.elQuestion.open .elQuestionSongContainer {
    display:block;
}

.elQuestionSongContainer {
    display:none;
    height: auto !important;
}
`)
