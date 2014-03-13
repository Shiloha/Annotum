jQuery(document).ready(function($){

	// Type-ahead
	$('.user-input').suggest( 'admin-ajax.php?action=anno-user-search', { delay: 200, minchars: 2, multiple: false} );

	/**
	* Reset the o.data that's been modified (stripped "<p>" tags for example)
	* back to the o.unfiltered property that was set inside the editor.js
	* pre_wpautop() method.
	*
	* This is required for the structure of the content to be maintained
	* within the TinyMCE editor after save.
	*
	* @TODO We may want to run our own type of _wpNop (see editor.dev.js) and remove
	* just the line that's removing the <p> tags.  It depends on how structured and
	* safe the content will be going in.
	*/

	// Only bind if post_type is article
	if ($("#post_type").val() == 'article') {
		$('body').bind('afterPreWpautop', function(event, o) {
			o.data = o.unfiltered;
		});

		// TinyMCE doesn't handle being moved in the DOM.  Destroy the
		// editor instances at the start of a sort and recreate
		// them afterwards.
		var _triggerAllEditors = function(event, creatingEditor) {
			var postbox, textarea;

			postbox = $(event.target);
			textarea = postbox.find('textarea.wp-editor-area');

			textarea.each(function(index, element) {
				var editor, is_active;
				editor = tinyMCE.EditorManager.get(element.id);
				is_active = $(this).parents('.tmce-active').length;
				console.log("moving textarea", element);
				if (creatingEditor) {
					if (!editor && is_active) {
						tinyMCE.execCommand('mceAddControl', true, element.id);
					}
				}
				else {
					if (editor && is_active) {
						editor.save();
						tinyMCE.execCommand('mceRemoveControl', true, element.id);
					}
				}
			});

		};
		$('#poststuff').on('sortstart', function(event) {
			_triggerAllEditors(event, false);
		}).on('sortstop', function(event) {
			_triggerAllEditors(event, true);
		});
	}

	anno_reset_doi_status = function() {
		$('#doi-status').hide().removeClass();
	};

	/**
	* Deposit DOI data
	*/
	$('#doi-deposit-submit').click(function() {
		var data = {action: 'anno-doi-deposit', article_id: ANNO_POST_ID};
		// Nonce
		data['_ajax_nonce-doi-deposit'] = $('#_ajax_nonce-doi-deposit').val();

		anno_reset_doi_status();

		$.post(ajaxurl, data, function(d) {
			if (d.regenerate_markup) {
				// Only insert it if there isn't one on the page already
				if ($("#doi-regenerate").length == 0) {
					$(d.regenerate_markup).insertBefore('#doi-deposit-submit');
				}
			}
		}, 'json');
		return false;
	});

	/**
	* DOI regeneration
	*/
	$('#doi-regenerate').live('click', function() {
		var data = {action: 'anno-doi-regenerate', article_id: ANNO_POST_ID};
		// Nonce
		data['_ajax_nonce-doi-regenerate'] = $('#_ajax_nonce-doi-regenerate').val();

		anno_reset_doi_status();

		$.post(ajaxurl, data, function(d) {
			if (d.doi) {
				$('#doi.meta-doi-input').val(d.doi);
				$('#doi-status').addClass('anno-success').html(d.status).show();
			}
		}, 'json');
		return false;
	});

	// We already hide with JS, lets remove the html/visual switch buttons
	$('.wp-switch-editor').remove();
	$('.wp-editor-tools').remove();

	// Validation alerts on save
	$(function(){
		var $saveButton = $('.js-validation-button, #publish, #save-post');

		$saveButton.on('click', annoProcessSave);

		// So validation occurs on click and doesnt go through submitting
		$('form#post').on('submit', annoPreventDefault);

		function annoPreventDefault(e) {
			e.preventDefault();
		}
		function annoProcessSave(e) {
			e.preventDefault();
			var excerpt = tinyMCE.editors['excerpt'].getContent(),
			content = tinyMCE.editors['content'].getContent(),
			$t = $(this);

			excerpt = '<abstract>' + excerpt.replace(/^<!DOCTYPE[^>]*?>/, '') + '</abstract>';
			content = '<body>' + content.replace(/^<!DOCTYPE[^>]*?>/, '') + '</body>';

			$(document).on('annoValidationAll', annoValidateSave);

			window.annoValidation.validateAll(content, excerpt).then(function(){
				if ($t.is('a')) {
					$saveButton.off('click', annoProcessSave);
					$t.trigger('click');
				}
				else {
					$('form#post').off('submit', annoPreventDefault);
					$('form#post').submit();
				}
			});

		}

		function annoValidateSave(e, data) {
			var msg = null;

			$(document).off('annoValidationAll', annoValidateSave);
			console.log(data);
			if (data.status == 'error') {
				if (data.body.status == 'error' && data.abstract.status == 'error') {
					msg = annoArticle.validationBothMsg;
				}
				else if (data.body.status == 'error') {
					msg = annoArticle.validationBodyMsg;
				}
				else if (data.abstract.status == 'error') {
					msg = annoArticle.validationAbstractMsg;
				}

				alert(msg);
			}
		}
	});


});
