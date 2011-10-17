/*
 * Copyright (c) 2009, 2010 and 2011 Frank G. Bennett, Jr. All Rights
 * Reserved.
 *
 * The contents of this file are subject to the Common Public
 * Attribution License Version 1.0 (the “License”); you may not use
 * this file except in compliance with the License. You may obtain a
 * copy of the License at:
 *
 * http://bitbucket.org/fbennett/citeproc-js/src/tip/LICENSE.
 *
 * The License is based on the Mozilla Public License Version 1.1 but
 * Sections 14 and 15 have been added to cover use of software over a
 * computer network and provide for limited attribution for the
 * Original Developer. In addition, Exhibit A has been modified to be
 * consistent with Exhibit B.
 *
 * Software distributed under the License is distributed on an “AS IS”
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 *
 * The Original Code is the citation formatting software known as
 * "citeproc-js" (an implementation of the Citation Style Language
 * [CSL]), including the original test fixtures and software located
 * under the ./std subdirectory of the distribution archive.
 *
 * The Original Developer is not the Initial Developer and is
 * __________. If left blank, the Original Developer is the Initial
 * Developer.
 *
 * The Initial Developer of the Original Code is Frank G. Bennett,
 * Jr. All portions of the code written by Frank G. Bennett, Jr. are
 * Copyright (c) 2009 and 2010 Frank G. Bennett, Jr. All Rights Reserved.
 *
 * Alternatively, the contents of this file may be used under the
 * terms of the GNU Affero General Public License (the [AGPLv3]
 * License), in which case the provisions of [AGPLv3] License are
 * applicable instead of those above. If you wish to allow use of your
 * version of this file only under the terms of the [AGPLv3] License
 * and not to allow others to use your version of this file under the
 * CPAL, indicate your decision by deleting the provisions above and
 * replace them with the notice and other provisions required by the
 * [AGPLv3] License. If you do not delete the provisions above, a
 * recipient may use your version of this file under either the CPAL
 * or the [AGPLv3] License.”
 */

/*global CSL: true */

CSL.dateMacroAsSortKey = function (state, Item) {
	CSL.dateAsSortKey.call(this, state, Item, true);
};


CSL.dateAsSortKey = function (state, Item, isMacro) {
	var dp, elem, value, e, yr, prefix, i, ilen, num;
	var variable = this.variables[0];
	var macroFlag = "empty";
	if (isMacro) {
		macroFlag = "macro-with-date";
	}
	dp = Item[variable];
	if ("undefined" === typeof dp) {
		dp = {"date-parts": [[0]] };
		if (!dp.year) {
			state.tmp.empty_date = true;
		}
	}
	if ("undefined" === typeof this.dateparts) {
		this.dateparts = ["year", "month", "day"];
	}
	if (dp.raw) {
		dp = state.fun.dateparser.parse(dp.raw);
	} else if (dp["date-parts"]) {
		dp = state.dateParseArray(dp);
	}
	if ("undefined" === typeof dp) {
		dp = {};
	}
	for (i = 0, ilen = CSL.DATE_PARTS_INTERNAL.length; i < ilen; i += 1) {
		elem = CSL.DATE_PARTS_INTERNAL[i];
		value = 0;
		e = elem;
		if (e.slice(-4) === "_end") {
			e = e.slice(0, -4);
		}
		if (dp[elem] && this.dateparts.indexOf(e) > -1) {
			value = dp[elem];
		}
		if (elem.slice(0, 4) === "year") {
			yr = CSL.Util.Dates[e].numeric(state, value);
			prefix = "Y";
			if (yr[0] === "-") {
				prefix = "X";
				yr = yr.slice(1);
				yr = 9999 - parseInt(yr, 10);
			}
			state.output.append(CSL.Util.Dates[elem.slice(0, 4)].numeric(state, (prefix + yr)), macroFlag);
		} else {
			state.output.append(CSL.Util.Dates[e]["numeric-leading-zeros"](state, value), macroFlag);
		}
	}
	if (state.registry.registry[Item.id] && state.registry.registry[Item.id].disambig.year_suffix) {
		num = state.registry.registry[Item.id].disambig.year_suffix.toString();
		num = CSL.Util.padding(num);
	} else {
		num = CSL.Util.padding("0");
	}
	state.output.append("S"+num, macroFlag);
};
