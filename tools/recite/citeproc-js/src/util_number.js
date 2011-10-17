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

CSL.Util.padding = function (num) {
	var m = num.match(/\s*(-{0,1}[0-9]+)/);
	if (m) {
		num = parseInt(m[1], 10);
		if (num < 0) {
			num = 99999999999999999999 + num;
		}
		num = "" + num;
		while (num.length < 20) {
			num = "0" + num;
		}
	}
	return num;
};

CSL.Util.LongOrdinalizer = function () {};

CSL.Util.LongOrdinalizer.prototype.init = function (state) {
	this.state = state;
};

CSL.Util.LongOrdinalizer.prototype.format = function (num, gender) {
	if (num < 10) {
		num = "0" + num;
	}
	// Argument true means "loose".
	var ret = CSL.Engine.getField(
		CSL.LOOSE, 
		this.state.locale[this.state.opt.lang].terms,
		"long-ordinal-" + num,
		"long", 
		0, 
		gender
	);
	if (!ret) {
		ret = this.state.fun.ordinalizer.format(num, gender);
	}
	// Probably too optimistic -- what if only renders in _sort?
	this.state.tmp.cite_renders_content = true;
	return ret;
};


CSL.Util.Ordinalizer = function () {};

CSL.Util.Ordinalizer.prototype.init = function (state) {
	this.suffixes = {};
	for (var i = 0, ilen = 3; i < ilen; i += 1) {
		var gender = [undefined, "masculine", "feminine"][i];
		this.suffixes[gender] = [];
		for (var j = 1; j < 5; j += 1) {
			var ordinal = state.getTerm("ordinal-0" + j, "long", false, gender);
			if ("undefined" === typeof ordinal) {
				delete this.suffixes[gender];
				break;
			}
			this.suffixes[gender].push(ordinal);			
		}
	}
};

CSL.Util.Ordinalizer.prototype.format = function (num, gender) {
	var str;
	num = parseInt(num, 10);
	str = num.toString();
	if ((num / 10) % 10 === 1 || (num > 10 && num < 20)) {
		str += this.suffixes[gender][3];
	} else if (num % 10 === 1) {
		str += this.suffixes[gender][0];
	} else if (num % 10 === 2) {
		str += this.suffixes[gender][1];
	} else if (num % 10 === 3) {
		str += this.suffixes[gender][2];
	} else {
		str += this.suffixes[gender][3];
	}
	return str;
};

CSL.Util.Romanizer = function () {};

CSL.Util.Romanizer.prototype.format = function (num) {
	var ret, pos, n, numstr, len;
	ret = "";
	if (num < 6000) {
		numstr = num.toString().split("");
		numstr.reverse();
		pos = 0;
		n = 0;
		len = numstr.length;
		for (pos = 0; pos < len; pos += 1) {
			n = parseInt(numstr[pos], 10);
			ret = CSL.ROMAN_NUMERALS[pos][n] + ret;
		}
	}
	return ret;
};


/**
 * Create a suffix formed from a list of arbitrary characters of arbitrary length.
 * <p>This is a <i>lot</i> harder than it seems.</p>
 */
CSL.Util.Suffixator = function (slist) {
	if (!slist) {
		slist = CSL.SUFFIX_CHARS;
	}
	this.slist = slist.split(",");
};

/**
 * The format method.
 * <p>This method is used in generating ranges.  Every numeric
 * formatter (of which Suffixator is one) must be an instantiated
 * object with such a "format" method.</p>
 */

CSL.Util.Suffixator.prototype.format = function (N) {
	// Many thanks to Avram Lyon for this code, and good
	// riddance to the several functions that it replaces.
	var X;
	N += 1;
	var key = "";
	do {
		X = ((N % 26) === 0) ? 26 : (N % 26);
		key = this.slist[X-1] + key;
		N = (N - X) / 26;
	} while ( N !== 0 );
	return key;
};


CSL.Engine.prototype.processNumber = function (ItemObject, variable) {
	var num;
	var debug = false;
	num = ItemObject[variable];
	//SNIP-START
	if (debug) {
		print("=== "+variable+": "+num+" ===");
	}
	//SNIP-END
	this.tmp.shadow_numbers[variable] = {};
	if ("undefined" !== typeof num) {
		if ("number" === typeof num) {
			num = "" + num;
		}
		// Strip off enclosing quotes, if any. Parsing logic
		// does not depend on them, but we'll strip them if found.
		if (num.slice(0, 1) === '"' && num.slice(-1) === '"') {
			num = num.slice(1, -1);
		}
		
		if (this.variable === "page-first") {
			m = num.split(/\s*(?:&|,|-)\s*/);
			if (m) {
				num = m[0];
			}
		}
		// Check for valid multiple items.  If found, 
		// open a new empty level and iterate this, with 
		// intervening punctuation set as prefixes to the 
		// second and succeeding output blobs.
		//
		// (If we are in a cs:sort node, we use
		// the first number encountered only)
		var prefixes = num.split(/[0-9]+/);
		var all_with_spaces = true;
		// all_with_spaces will be false only if it is
		//   of length >= 3, and has a string with no
		//   space between position 1 and position length - 2.
		// Single numbers will evaluate true, because
		//   the length of prefixes in that case will be 2.
		for (var i = 0, ilen = prefixes.length - 1; i < ilen; i += 1) {
			if (prefixes[i] && (prefixes[i].indexOf(" ") === -1 || [" ",",","&"].indexOf(prefixes[i].slice(-1)) === -1)) {
				all_with_spaces = false;
				break;
			}
		}
		var non_numbers = 0;
		var elements = num.split(/\s+/);
		for (var i = 0, ilen = elements.length; i < ilen; i += 1) {
			//SNIP-START
			if (debug) {
				print("  element: "+elements[i]);
			}
			//SNIP-END
			if (!elements[i].match(/^(?:.*[0-9].*|[-,&])$/)) {
				non_numbers += 1;
			}
		}
		if (this.tmp.area !== "citation_sort"
			&& this.tmp.area !== "bibliography_sort"
			&& all_with_spaces 
			&& non_numbers < 2
			&& !num.match(/[^\- 0-9,&]/)) {
			var nums = num.match(/[0-9]+/g);
			// Expand ranges
			var range_ok = true;
			for (i = prefixes.length - 2; i > 0; i += -1) {
				if (prefixes && prefixes[i].indexOf("-") > -1) {
					var start = parseInt(nums[i - 1], 10);
					var end = parseInt(nums[i], 10);
					// Block silly values
					if (start >= end || start < (end - 1000)) {
						range_ok = false;
						break;
					}
					var replacement = [];
					for (j = start, jlen = end + 1; j < jlen; j += 1) {
						replacement.push(""+j);
					}
					nums = nums.slice(0, i - 1).concat(replacement).concat(nums.slice(i + 1));
				}
			}
			if (range_ok) {
				nums = nums.sort(function (a,b) {
					a = parseInt(a, 10);
					b = parseInt(b, 10);
					if (a > b) {
						return 1;
					} else if (a < b) {
						return -1;
					} else {
						return 0;
					}
				});
				// Eliminate duplicate numbers
				for (i = nums.length; i > -1; i += -1) {
					if (nums[i] === nums[i + 1]) {
						nums = nums.slice(0, i).concat(nums.slice(i + 1));
					}
				}
				this.tmp.shadow_numbers[variable].value = [];
				for (i = 0, ilen = nums.length; i < ilen; i += 1) {
					num = parseInt(nums[i], 10);
					this.tmp.shadow_numbers[variable].value.push(num);
				}
				if (nums.length > 1) {
					this.tmp.shadow_numbers[variable].plural = 1;
				} else {
					this.tmp.shadow_numbers[variable].plural = 0;
				}
				// XXX If nums is plural, set plural
				// XXX If nums is 1, set singular
				this.tmp.shadow_numbers[variable].numeric = true;
				//SNIP-START
				if (debug) {
					print("  branch 1");
				}
				//SNIP-END
				// XXX set numeric true
			} else {
				this.tmp.shadow_numbers[variable].value = [];
				this.tmp.shadow_numbers[variable].value.push(num);
				// set singular I guess
				this.tmp.shadow_numbers[variable].plural = 0;
				// XXX set numeric false
				this.tmp.shadow_numbers[variable].numeric = false;
				//SNIP-START
				if (debug) {
					print("  branch 2");
				}
				//SNIP-END
			}
		} else if (this.tmp.area !== "citation_sort"
				   && this.tmp.area !== "bibliography_sort"
				   && ((!all_with_spaces || prefixes.length > 2) || non_numbers > 1)) {
			// Don't attempt to apply numeric formatting
			// or to normalize the content for weird
			// numbers like "1-505" (no space between the
			// numbers and the hyphen suggests that 505 might
			// be meant as a leaf number)
			// ... or if multiple non-number elements exist in string.
			this.tmp.shadow_numbers[variable].value = [];
			this.tmp.shadow_numbers[variable].value.push(num);
			// XXX set singular if only one numeric number, otherwise plural
			if (elements.length > 1) {
				this.tmp.shadow_numbers[variable].plural = 1;
			} else {
				this.tmp.shadow_numbers[variable].plural = 0;
			}
			if (non_numbers) {
				this.tmp.shadow_numbers[variable].numeric = false;
			} else {
				this.tmp.shadow_numbers[variable].numeric = true;
			}
			//SNIP-START
			if (debug) {
				print("  branch 3");
			}
			//SNIP-END
			// XXX set numeric true
		} else {
			// Single number with no more than one descriptor
			var is_term = true;
			var matchterm = this.getTerm(variable, "short");
			if (matchterm) {
				matchterm = matchterm.replace(".", "").toLowerCase().split(/\s+/)[0];
				for (var i = 0, ilen = elements.length; i < ilen; i += 1) {
					if (elements[i]) {
						if (elements[i].match(/[0-9]/)) {
							continue;
						}
						if (elements[i].slice(0, matchterm.length).toLowerCase() !== matchterm) {
							is_term = false;
						}
					}
				}
			}
			m = num.match(/\s*([0-9]+)(?:[^\-:]* |[^\-:]*$)/);
			if (m && is_term) {
				num = parseInt(m[1], 10);
				this.tmp.shadow_numbers[variable].value = [];
				this.tmp.shadow_numbers[variable].value.push(num);
				// XXX set singular
				this.tmp.shadow_numbers[variable].plural = 0;
				this.tmp.shadow_numbers[variable].numeric = true;
				//SNIP-START
				if (debug) {
					print("  branch 4");
				}
				//SNIP-END
				// XXX numeric true
			} else {
				this.tmp.shadow_numbers[variable].value = [];
				this.tmp.shadow_numbers[variable].value.push(num);
				// XXX set singular I guess
				this.tmp.shadow_numbers[variable].plural = 0;
				// XXX numeric false
				if (num.match(/[0-9]/) && is_term) {
					this.tmp.shadow_numbers[variable].numeric = true;
				} else {
					this.tmp.shadow_numbers[variable].numeric = false;
				}
				//SNIP-START
				if (debug) {
					print("  branch 5");
				}
				//SNIP-END
			}
		}
	}
};
