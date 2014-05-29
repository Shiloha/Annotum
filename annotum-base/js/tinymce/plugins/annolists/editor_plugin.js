/**
 * Based on the lists plugin for tinyMCE developed by Moxiecode Systems AB
 * Released under LGPL License.
 *
 * License: http://tinymce.moxiecode.com/license
 * Contributing: http://tinymce.moxiecode.com/contributing
 */

(function() {
	var each = tinymce.each, Event = tinymce.dom.Event, bookmark;

	// Skips text nodes that only contain whitespace since they aren't semantically important.
	function skipWhitespaceNodes(e, next) {
		while (e && (e.nodeType === 8 || (e.nodeType === 3 && /^[ \t\n\r]*$/.test(e.nodeValue)))) {
			e = next(e);
		}
		return e;
	}

	function skipWhitespaceNodesBackwards(e) {
		return skipWhitespaceNodes(e, function(e) { return e.previousSibling; });
	}

	function skipWhitespaceNodesForwards(e) {
		return skipWhitespaceNodes(e, function(e) { return e.nextSibling; });
	}

	function hasParentInList(ed, e, list) {
		return ed.dom.getParent(e, function(p) {
			return tinymce.inArray(list, p) !== -1;
		});
	}

	function isList(e) {
		var classname = e.className;
		return e && classname && classname.toUpperCase() === 'LIST';
	}

	function splitNestedLists(element, dom, ed) {
		var tmp, nested, wrapItem;
		tmp = skipWhitespaceNodesBackwards(element.lastChild);
		while (isList(tmp)) {
			nested = tmp;
			tmp = skipWhitespaceNodesBackwards(nested.previousSibling);
		}
		if (nested) {
			wrapItem = dom.create(
				tinyMCE.activeEditor.plugins.textorum.translateElement('list-item'),
				{'class': 'list-item', 'data-xmlel': 'list-item', 'style': 'list-style-type: none;'}
			);

			dom.add(wrapItem, dom.create(
				ed.plugins.textorum.translateElement('p'),
				{'class': 'p', 'data-xmlel': 'p'},
				'&#xA0;'
			));

			dom.split(element, nested);
			dom.insertAfter(wrapItem, nested);
			wrapItem.appendChild(nested);
			wrapItem.appendChild(nested);
			element = wrapItem.previousSibling;
		}
		return element;
	}

	function attemptMergeWithAdjacent(e, allowDifferentListStyles, mergeParagraphs) {
		e = attemptMergeWithPrevious(e, allowDifferentListStyles, mergeParagraphs);
		return attemptMergeWithNext(e, allowDifferentListStyles, mergeParagraphs);
	}

	function attemptMergeWithPrevious(e, allowDifferentListStyles, mergeParagraphs) {
		var prev = skipWhitespaceNodesBackwards(e.previousSibling);
		if (prev) {
			return attemptMerge(prev, e, allowDifferentListStyles ? prev : false, mergeParagraphs);
		} else {
			return e;
		}
	}

	function attemptMergeWithNext(e, allowDifferentListStyles, mergeParagraphs) {
		var next = skipWhitespaceNodesForwards(e.nextSibling);
		if (next) {
			return attemptMerge(e, next, allowDifferentListStyles ? next : false, mergeParagraphs);
		} else {
			return e;
		}
	}

	function attemptMerge(e1, e2, differentStylesMasterElement, mergeParagraphs) {
		if (canMerge(e1, e2, !!differentStylesMasterElement, mergeParagraphs)) {
			return merge(e1, e2, differentStylesMasterElement);
		}
		else if (e1 && e1.className.toUpperCase() === 'LIST-ITEM' && isList(e2)) {
			// Fix invalidly nested lists.
			e1.appendChild(e2);
		}
		return e2;
	}

	function canMerge(e1, e2, allowDifferentListStyles, mergeParagraphs) {
		var dom = tinymce.activeEditor.dom;

		if (!e1 || !e2) {
			return false;
		}
		else if (e1.className.toUpperCase() === 'LIST-ITEM' && e2.className.toUpperCase() === 'LIST-ITEM') {
			return containsOnlyAList(e2);
		}
		else if (isList(e1)) {
			return (dom.getAttrib(e2, 'list-type') === dom.getAttrib(e1, 'list-type'));
		}
		else if (mergeParagraphs && e1.className.toUpperCase() === 'P' && e2.className.toUpperCase() === 'P') {
			return true;
		}
		else {
			return false;
		}
	}

	function isListForIndent(e) {
		var firstLI = skipWhitespaceNodesForwards(e.firstChild), lastLI = skipWhitespaceNodesBackwards(e.lastChild);
		return firstLI && lastLI && isList(e) && firstLI === lastLI && (isList(firstLI) || firstLI.style.listStyleType === 'none'  || containsOnlyAList(firstLI));
	}

	function containsOnlyAList(e) {
		var firstChild = skipWhitespaceNodesForwards(e.firstChild), lastChild = skipWhitespaceNodesBackwards(e.lastChild);
		return firstChild && lastChild && firstChild === lastChild && isList(firstChild);
	}

	function merge(e1, e2, masterElement) {
		var lastOriginal = skipWhitespaceNodesBackwards(e1.lastChild), firstNew = skipWhitespaceNodesForwards(e2.firstChild);
		var dom = tinymce.activeEditor.dom;

		if (e1.className.toUpperCase() === 'P') {
			e1.appendChild(e1.ownerDocument.createElement('br'));
		}
		while (e2.firstChild) {
			e1.appendChild(e2.firstChild);
		}
		if (masterElement) {
			e1.style.listStyleType = masterElement.style.listStyleType;
		}

		e2.parentNode.removeChild(e2);

		attemptMerge(lastOriginal, firstNew, false);

		return e1;
	}

	function findItemToOperateOn(e, dom) {
		var item;
		if (!dom.is(e, '.list-item,.list')) {
			item = dom.getParent(e, '.list-item');
			if (item) {
				e = item;
			}
		}
		return e;
	}

	tinymce.create('tinymce.plugins.annoLists', {
		init: function(ed, url) {
			var t = this;
			t.helper = ed.plugins.textorum.helper;

			var enterDownInEmptyList = false;

			// Wrap the innards wiht a p tag
			ed.onNodeChange.add(function(ed, object, e) {
				if (t.helper.getLocalName(e.parentNode) == 'list-item' && t.helper.getLocalName(e.parentNode.firstChild) != 'p') {
					var pTags = ed.dom.select('.p', e.parentNode);
					if (pTags.length == 0) {
						var content = e.parentNode.innerHTML;
						var pNode = ed.dom.create(
							ed.plugins.textorum.translateElement('p'),
							{'class': 'p', 'data-xmlel': 'p'},
							content
						);

						e.parentNode.innerHTML = (pNode.outerHTML);
					}

				}
			});


			function isTriggerKey(e) {
				return e.keyCode === 9 ;
			};

			function isEnterInEmptyListItem(ed, e) {
				var node = ed.selection.getNode(),
					listItemParent = ed.dom.getParent(node, '.list-item');

				if (e.keyCode === 13) {
					return listItemParent;
				}

				return false;
			};

			function cancelKeys(ed, e) {
				if (isTriggerKey(e)) {//|| isEnterInEmptyListItem(ed, e)) {
					return Event.cancel(e);
				}
			};

			function imageJoiningListItem(ed, e) {
				if (!tinymce.isGecko)
					return;

				var n = ed.selection.getStart();
				if (e.keyCode != 8 || n.tagName !== 'IMG')
					return;

				function lastLI(node) {
					var child = node.firstChild;
					var li = null;
					do {
						if (!child)
							break;

						if (this.helper.getLocalName(child) === 'list-item')
							li = child;
					} while (child = child.nextSibling);

					return li;
				}

				function addChildren(parentNode, destination) {
					while (parentNode.childNodes.length > 0)
						destination.appendChild(parentNode.childNodes[0]);
				}

				var ul;
				if (n.parentNode.previousSibling.className.toUpperCase() === 'LIST') {
					ul = n.parentNode.previousSibling;
				}
				else if (n.parentNode.previousSibling.previousSibling.className.toUpperCase() === 'LIST') {
					ul = n.parentNode.previousSibling.previousSibling;
				}
				else {
					return;
				}

				var li = lastLI(ul);

				// move the caret to the end of the list item
				var rng = ed.dom.createRng();
				rng.setStart(li, 1);
				rng.setEnd(li, 1);
				ed.selection.setRng(rng);
				ed.selection.collapse(true);

				// save a bookmark at the end of the list item
				var bookmark = ed.selection.getBookmark();

				// copy the image an its text to the list item
				var clone = n.parentNode.cloneNode(true);
				if (clone.className.toUpperCase() === 'P')
					addChildren(clone, li);
				else
					li.appendChild(clone);

				// remove the old copy of the image
				n.parentNode.parentNode.removeChild(n.parentNode);

				// move the caret where we saved the bookmark
				ed.selection.moveToBookmark(bookmark);
			}

			this.ed = ed;
			ed.addCommand('Indent', this.indent, this);
			ed.addCommand('Outdent', this.outdent, this);
			ed.addCommand('AnnoInsertUnorderedList', function() {
				this.applyList('bullet', 'order');
			}, this);
			ed.addCommand('AnnoInsertOrderedList', function() {
				this.applyList('order', 'bullet');
			}, this);


			ed.addButton('annoorderedlist', {
				//removing for temp fix-- title : ed.getLang('advanced.link_desc'),
				title : 'Insert Ordered List',
				cmd : 'AnnoInsertOrderedList'
			});

			ed.addButton('annobulletlist', {
				//removing for temp fix-- title : ed.getLang('advanced.link_desc'),
				// TODO: Internationalize
				title : 'Insert Bullet List',
				cmd : 'AnnoInsertUnorderedList'
			});

			ed.onKeyUp.addToTop(function(ed, e) {
				var n, rng;
				if (isTriggerKey(e)) {
					ed.execCommand(e.shiftKey ? 'Outdent' : 'Indent', true, null);
					return Event.cancel(e);
				}
 				else if (enterDownInEmptyList && isEnterInEmptyListItem(ed, e)) {
					if (ed.queryCommandState('AnnoInsertOrderedList')) {
						ed.execCommand('AnnoInsertOrderedList');
					} else {
						ed.execCommand('AnnoInsertUnorderedList');
					}
					n = ed.selection.getStart();
					if (n && n.className.toUpperCase() === 'LIST-ITEM') {
						// Fix the caret position on IE since it jumps back up to the previous list item.
						n = ed.dom.getParent(n, '.list').nextSibling;
						if (n && n.className.toUpperCase() === 'P') {
							if (!n.firstChild) {
								n.appendChild(ed.getDoc().createTextNode(''));
							}
							rng = ed.dom.createRng();
							rng.setStart(n.firstChild, 1);
							rng.setEnd(n.firstChild, 1);
							ed.selection.setRng(rng);
						}
					}
					return Event.cancel(e);
				}
			});
			ed.onKeyPress.addToTop(cancelKeys);
			ed.onKeyDown.addToTop(cancelKeys);
			ed.onKeyDown.addToTop(imageJoiningListItem);
		},

		applyList: function(targetListType, oppositeListType) {
			var t = this, ed = t.ed, dom = ed.dom, applied = [], hasSameType = false, hasOppositeType = false, hasNonList = false, actions,
				selectedBlocks = ed.selection.getSelectedBlocks();

			function cleanupBr(e) {
				if (e && e.tagName === 'BR') {
					dom.remove(e);
				}
			}

			function makeList(element) {
				var list = dom.create(
						tinyMCE.activeEditor.plugins.textorum.translateElement('list'),
						{
							'list-type': targetListType,
							'class': 'list',
							'data-xmlel': 'list'
						}
					), li;

				if (element.className.toUpperCase() === 'LIST-ITEM') {
					// No change required.
				}
				else if (element.className.toUpperCase() === 'P' || element.tagName === 'BODY') {
					processBrs(element, function(startSection, br, previousBR) {
						doWrapList(startSection, br, element.tagName === 'BODY' ? null : startSection.parentNode);
						li = dom.getParent(startSection, '.list-item');
						cleanupBr(br);
					});
					attemptMergeWithAdjacent(li.parentNode, true);

					return;
				}
				else {
					// Put the list around the element.
					li = dom.create(
						tinyMCE.activeEditor.plugins.textorum.translateElement('list-item'),
						{'class': 'list-item', 'data-xmlel': 'list-item'}
					);

					dom.add(li, dom.create(
						ed.plugins.textorum.translateElement('p'),
						{'class': 'p', 'data-xmlel': 'p'},
						'&#xA0;'
					));
					dom.insertAfter(li, element);
					li.appendChild(element);
					element = li;
				}

				dom.insertAfter(list, element);
				list.appendChild(element);
				applied.push(element);
			}

			function doWrapList(start, end, template) {
				var li, n = start, tmp, i, title, content;
				while (!dom.isBlock(start.parentNode) && start.parentNode !== dom.getRoot()) {
					start = dom.split(start.parentNode, start.previousSibling);
					start = start.nextSibling;
					n = start;
				}
				if (template) {
					li = template.cloneNode(true);
					content = li.innerHTML;
					li.innerHTML = '';
					li.innerText = '';
					start.parentNode.insertBefore(li, start);
					while (li.firstChild) dom.remove(li.firstChild);
					//Title
					li.setAttribute('class', 'list-item');
					li.setAttribute('data-xmlel', 'list-item');

					dom.add(li, dom.create(
						ed.plugins.textorum.translateElement('p'),
						{'class': 'p', 'data-xmlel': 'p'},
						''
					));

				} else {
					li = dom.create(
						tinyMCE.activeEditor.plugins.textorum.translateElement('list-item'),
						{'class': 'list-item', 'data-xmlel': 'list-item'}
					);

					dom.add(li, dom.create(
						ed.plugins.textorum.translateElement('p'),
						{'class': 'p', 'data-xmlel': 'p'},
						'&#xA0;'
					));

					//Title
					start.parentNode.insertBefore(li, start);
				}
				while (n && n != end) {
					tmp = n.nextSibling;
					li.firstChild.appendChild(n);
					n = tmp;
				}
				if (li.childNodes.length === 0) {
					li.innerHTML = '<br _mce_bogus="1" />';
				}
				makeList(li);
			}

			function processBrs(element, callback) {
				var startSection, previousBR, END_TO_START = 3, START_TO_END = 1,
					breakElements = 'br,.list,.p:not(.list-item > .p),.title,table,.disp-quote,.pre,dl';
				function isAnyPartSelected(start, end) {
					var r = dom.createRng(), sel;
					bookmark.keep = true;
					ed.selection.moveToBookmark(bookmark);
					bookmark.keep = false;
					sel = ed.selection.getRng(true);
					if (!end) {
						end = start.parentNode.lastChild;
					}
					r.setStartBefore(start);
					r.setEndAfter(end);
					return !(r.compareBoundaryPoints(END_TO_START, sel) > 0 || r.compareBoundaryPoints(START_TO_END, sel) <= 0);
				}
				function nextLeaf(br) {
					if (br.nextSibling) {
						return br.nextSibling;
					}
					if (!dom.isBlock(br.parentNode) && br.parentNode !== dom.getRoot()) {
						return nextLeaf(br.parentNode);
					}
				}
				// Split on BRs within the range and process those.
				startSection = element.firstChild;
				// First mark the BRs that have any part of the previous section selected.
				var trailingContentSelected = false;
				each(dom.select(breakElements, element), function(br) {
					var b;
					if (br.hasAttribute && br.hasAttribute('_mce_bogus')) {
						return true; // Skip the bogus Brs that are put in to appease Firefox and Safari.
					}

					if (!!startSection && isAnyPartSelected(startSection, br)) {
						dom.addClass(br, '_mce_tagged_br');
						startSection = nextLeaf(br);
					}
				});
				trailingContentSelected = (startSection && isAnyPartSelected(startSection, undefined));
				startSection = element.firstChild;

				each(dom.select(breakElements, element), function(br) {
					// Got a section from start to br.
					var tmp = nextLeaf(br);
					if (br.hasAttribute && br.hasAttribute('_mce_bogus')) {
						return true; // Skip the bogus Brs that are put in to appease Firefox and Safari.
					}
					if (dom.hasClass(br, '_mce_tagged_br')) {
						callback(startSection, br, previousBR);
						previousBR = null;
					} else {
						previousBR = br;
					}
					startSection = tmp;
				});

				if (trailingContentSelected) {
					callback(startSection, undefined, previousBR);
				}
			}

			function wrapList(element) {
				processBrs(element, function(startSection, br, previousBR) {
					// Need to indent this part
					doWrapList(startSection, br);
					cleanupBr(br);
					cleanupBr(previousBR);
				});
			}

			function changeList(element) {
				if (tinymce.inArray(applied, element) !== -1) {
					return;
				}

				if (dom.getAttrib(element.parentNode, 'list-type') === oppositeListType) {
					dom.split(element.parentNode, element);
					makeList(element);
				}
				applied.push(element);
			}

			function convertListItemToParagraph(element) {
				var child, nextChild, mergedElement, splitLast, hasPChild;
				if (tinymce.inArray(applied, element) !== -1) {
					return;
				}
				element = splitNestedLists(element, dom, this.ed);
				while (dom.is(element.parentNode, '.list,.list-item')) {
					dom.split(element.parentNode, element);
				}

				if (element.firstChild != null && element.firstChild.className.toUpperCase() == 'P') {
					hasPChild = true;
				}

				// Push the original element we have from the selection, not the renamed one.
				applied.push(element);

				// If the list is already contained in a p tag, dont wrap in another.
				if (dom.getParent(element, '.p') == null && !hasPChild) {
					element.setAttribute('class', 'p');
					element.setAttribute('data-xmlel', 'p');
				}
				else {
					if (hasPChild) {
						dom.setOuterHTML(element, element.firstChild.innerHTML);
					}
					else {
						dom.setOuterHTML(element, element.innerHTML);
					}
				}
			}

			each(selectedBlocks, function(e) {
				e = findItemToOperateOn(e, dom);

				if (dom.getAttrib(e, 'list-type') === oppositeListType || (e.className.toUpperCase() === 'LIST-ITEM' && dom.getAttrib(e.parentNode, 'list-type') === oppositeListType)) {
					hasOppositeType = true;
				}
				else if (dom.getAttrib(e, 'list-type') === targetListType || (e.className.toUpperCase() === 'LIST-ITEM' && dom.getAttrib(e.parentNode, 'list-type') === targetListType)) {
					hasSameType = true;
				}
				else {
					hasNonList = true;
				}
			});

			if (hasNonList || hasOppositeType || selectedBlocks.length === 0) {
				actions = {
					'LIST-ITEM': changeList,
					'TITLE': makeList,
					'P': makeList,
					'BODY': makeList,
					'DIV': selectedBlocks.length > 1 ? makeList : wrapList,
					defaultAction: wrapList
				};
			} else {
				actions = {
					defaultAction: convertListItemToParagraph
				};
			}
			this.process(actions);
		},

		indent: function() {
			var ed = this.ed, dom = ed.dom, indented = [];

			function createWrapItem(element) {
				var wrapItem = dom.create(
					ed.plugins.textorum.translateElement('list-item'),
					{'class': 'list-item', 'data-xmlel': 'list-item'}
				);

				dom.insertAfter(wrapItem, element);
				return wrapItem;
			}

			function createWrapList(element) {
				var wrapItem = createWrapItem(element),
					list = dom.getParent(element, '.list'),
					listType = dom.getAttrib(list, 'list-type'),
					wrapList = dom.create(
						ed.plugins.textorum.translateElement('list'),
						{
							'list-type': listType,
							'class': 'list',
							'data-xmlel': 'list'
						}
					);

				dom.add(wrapItem, dom.create(
					ed.plugins.textorum.translateElement('p'),
					{'class': 'p', 'data-xmlel': 'p'},
					'&#xA0;'
				));

				wrapItem.appendChild(wrapList);
				return wrapList;
			}

			function indentLI(element) {
				if (!hasParentInList(ed, element, indented)) {
					element = splitNestedLists(element, dom, ed);
					var wrapList = createWrapList(element);
					wrapList.appendChild(element);
					attemptMergeWithAdjacent(wrapList.parentNode, false);
					attemptMergeWithAdjacent(wrapList, false);
					indented.push(element);
				}
			}

			this.process({
				'LIST-ITEM': indentLI,
				defaultAction: this.adjustPaddingFunction(true)
			});

		},

		outdent: function() {
			var t = this, ed = t.ed, dom = ed.dom, outdented = [];

			function outdentLI(element) {
				var listElement, targetParent, align;
				if (!hasParentInList(ed, element, outdented)) {
					if (dom.getStyle(element, 'margin-left') !== '' || dom.getStyle(element, 'padding-left') !== '') {
						return t.adjustPaddingFunction(false)(element);
					}
					align = dom.getStyle(element, 'text-align', true);
					if (align === 'center' || align === 'right') {
						dom.setStyle(element, 'text-align', 'left');
						return;
					}
					element = splitNestedLists(element, dom, ed);
					listElement = element.parentNode;
					targetParent = element.parentNode.parentNode;
					if (targetParent.className.toUpperCase() === 'P') {
						dom.split(targetParent, element.parentNode);
					} else {
						dom.split(listElement, element);
						if (targetParent.tagName === 'LI') {
							// Nested list, need to split the LI and go back out to the OL/UL element.
							dom.split(targetParent, element);
						} else if (!dom.is(targetParent, 'ol,ul')) {
							element.setAttribute('class', 'p');
							element.setAttribute('data-xmlel', 'p');
						}
					}
					outdented.push(element);
				}
			}

			this.process({
				'LI': outdentLI,
				defaultAction: this.adjustPaddingFunction(false)
			});

			each(outdented, attemptMergeWithAdjacent);
		},

		process: function(actions) {
			var t = this, sel = t.ed.selection, dom = t.ed.dom, selectedBlocks, r;

			function processElement(element) {
				dom.removeClass(element, '_mce_act_on');
				if (!element || element.nodeType !== 1) {
					return;
				}
				element = findItemToOperateOn(element, dom);
				var action = actions[element.className.toUpperCase()];
				if (!action) {
					action = actions.defaultAction;
				}
				action(element);
			}
			function recurse(element) {
				t.splitSafeEach(element.childNodes, processElement);
			}
			function brAtEdgeOfSelection(container, offset) {
				return offset >= 0 && container.hasChildNodes() && offset < container.childNodes.length &&
						container.childNodes[offset].tagName === 'BR';
			}
			selectedBlocks = sel.getSelectedBlocks();
			if (selectedBlocks.length === 0) {
				selectedBlocks = [ dom.getRoot() ];
			}

			r = sel.getRng(true);
			if (!r.collapsed) {
				if (brAtEdgeOfSelection(r.endContainer, r.endOffset - 1)) {
					r.setEnd(r.endContainer, r.endOffset - 1);
					sel.setRng(r);
				}
				if (brAtEdgeOfSelection(r.startContainer, r.startOffset)) {
					r.setStart(r.startContainer, r.startOffset + 1);
					sel.setRng(r);
				}
			}
			bookmark = sel.getBookmark();
			actions.LIST = recurse;
			t.splitSafeEach(selectedBlocks, processElement);
			sel.moveToBookmark(bookmark);
			bookmark = null;
			// Avoids table or image handles being left behind in Firefox.
			t.ed.execCommand('mceRepaint');
		},

		splitSafeEach: function(elements, f) {
			var t = this, ed = t.ed;
			if (tinymce.isGecko && (/Firefox\/[12]\.[0-9]/.test(navigator.userAgent) ||
					/Firefox\/3\.[0-4]/.test(navigator.userAgent))) {
				this.classBasedEach(elements, f);
			} else {
				each(elements, f);
			}
		},

		classBasedEach: function(elements, f) {
			var dom = this.ed.dom, nodes, element;
			// Mark nodes
			each(elements, function(element) {
				dom.addClass(element, '_mce_act_on');
			});
			nodes = dom.select('._mce_act_on');
			while (nodes.length > 0) {
				element = nodes.shift();
				dom.removeClass(element, '_mce_act_on');
				f(element);
				nodes = dom.select('._mce_act_on');
			}
		},

		adjustPaddingFunction: function(isIndent) {
			var indentAmount, indentUnits, ed = this.ed;
			indentAmount = ed.settings.indentation;
			indentUnits = /[a-z%]+/i.exec(indentAmount);
			indentAmount = parseInt(indentAmount, 10);
			return function(element) {
				var currentIndent, newIndentAmount;
				currentIndent = parseInt(ed.dom.getStyle(element, 'margin-left') || 0, 10) + parseInt(ed.dom.getStyle(element, 'padding-left') || 0, 10);
				if (isIndent) {
					newIndentAmount = currentIndent + indentAmount;
				} else {
					newIndentAmount = currentIndent - indentAmount;
				}
				ed.dom.setStyle(element, 'padding-left', '');
				ed.dom.setStyle(element, 'margin-left', newIndentAmount > 0 ? newIndentAmount + indentUnits : '');
			};
		},


		getInfo: function() {
			return {
				longname : 'Annotum Lists',
				author : 'Crowd Favorite',
				authorurl : 'http://crowdfavorite.com',
				infourl : '',
				version : "1.0"
			};
		}
	});
	tinymce.PluginManager.add("annoLists", tinymce.plugins.annoLists);
}());

