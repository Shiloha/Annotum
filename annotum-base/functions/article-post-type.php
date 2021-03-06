<?php

/**
 * @package anno
 * This file is part of the Annotum theme for WordPress
 * Built on the Carrington theme framework <http://carringtontheme.com>
 *
 * Copyright 2008-2011 Crowd Favorite, Ltd. All rights reserved. <http://crowdfavorite.com>
 * Released under the GPL license
 * http://www.opensource.org/licenses/gpl-license.php
 */

/**
 * Register article post type
 */
function anno_register_post_types() {
	if (anno_workflow_enabled()) {
		$capability_type = array('article', 'articles');
	}
	else {
		$capability_type = 'post';
	}

	$labels = array(
		'name' => _x('Articles', 'post type name', 'anno'),
		'singular_name' => _x('Article', 'post type singular name', 'anno'),
		'add_new_item' => _x('Add New Article', 'post type plural name', 'anno'),
		'edit_item' => _x('Edit Article', 'post type label', 'anno'),
		'new_item' => _x('New Article', 'post type label', 'anno'),
		'view_item' => _x('View Article', 'post type label', 'anno'),
		'search_items' => _x('Search Articles', 'post type label', 'anno'),
		'not_found' => _x('No Articles found', 'post type label', 'anno'),
		'not_found_in_trash' => _x('No Articles found in Trash', 'post type label', 'anno'),
		'menu_name' => _x('Articles', 'post type label, noun', 'anno'),
	);
	$args = array(
	        'labels' => $labels,
	        'public' => true,
	        'show_ui' => true,
	        'has_archive' => true,
	        'hierarchical' => false,
	        'rewrite' => true,
	        'query_var' => 'articles',
	        'supports' => array('title', 'thumbnail', 'comments', 'revisions', 'author'),
			'taxonomies' => array(),
			'menu_position' => 5,
			'capability_type' => $capability_type,
			'menu_icon' => 'dashicons-welcome-write-blog',
	);
	register_post_type('article', $args);
}
add_action('after_setup_theme', 'anno_register_post_types');

/**
 * Request handler for post types (article)
 */
function anno_post_type_requst_handler() {
	// Converts Article to Post post type
	if (isset($_POST['anno_convert'])) {
		wp_verify_nonce($_POST['anno_convert_nonce'], 'anno_convert');
		if(!current_user_can('editor') && !current_user_can('administrator')) {
			wp_die(_x('Unable to perform that ability', 'wp_die error message', 'anno'));
		}
		$post_id = absint($_POST['post_ID']);
		anno_article_to_post($post_id);
		wp_redirect(get_edit_post_link($post_id, 'redirect'));
		die();
	}
}
add_action('admin_init', 'anno_post_type_requst_handler', 0);

/**
 * Display custom messages for articles. Based on WP high 3.1.2
 */
function anno_post_updated_messages($messages) {
	global $post;
	// Based on message code in WP high 3.2
	$messages['article'] = array(
		0 => '', // Unused. Messages start at index 1.
		1 => sprintf(_x('Article updated. <a href="%s">View article</a>', 'Article updated message', 'anno'), esc_url(get_permalink($post->ID))),
		2 => _x('Custom field updated.', 'Article updated message', 'anno'),
		3 => _x('Custom field deleted.', 'Article updated message', 'anno'),
		4 => _x('Article updated.', 'Article updated message', 'anno'),
	 	5 => isset($_GET['revision']) ? sprintf( _x('Article restored to revision from %s', 'Article updated message', 'anno'), wp_post_revision_title((int) $_GET['revision'], false )) : false,
		6 => sprintf(_x('Article published. <a href="%s">View article</a>', 'Article updated message', 'anno'), esc_url(get_permalink($post->ID))),
		7 => _x('Article saved.', 'Article updated message', 'anno'),
		8 => sprintf( _x('Article submitted. <a target="_blank" href="%s">Preview article</a>', 'Article updated message', 'anno'), esc_url(add_query_arg('preview', 'true', get_permalink($post->ID)))),
		9 => sprintf( _x('Article scheduled for: <strong>%1$s</strong>. <a target="_blank" href="%2$s">Preview article</a>', 'Article updated message', 'anno'), date_i18n( _x( 'M j, Y @ G:i', 'Article updated future time format', 'anno' ), strtotime( $post->post_date )), esc_url( get_permalink($post->ID))),
		10 => sprintf( _x('Article draft updated. <a target="_blank" href="%s">Preview article</a>', 'Article updated message', 'anno'), esc_url( add_query_arg('preview', 'true', get_permalink($post->ID)))),
		11 => _x('Article successfully cloned.', 'Article updated message', 'anno'),
		12 => _x('Unable to clone article.', 'Article updated message', 'anno'),
		13 => _x('Article unpublished; there was an error in validation.', 'Article updated message', 'anno'),
	);

	return $messages;
}
add_filter('post_updated_messages', 'anno_post_updated_messages');

/**
 * Add DTD Meta Boxes
 */
function anno_article_meta_boxes($article) {
	$appendices = get_post_meta($article->ID, '_anno_appendices', true);

	add_meta_box('subtitle', _x('Subtitle', 'Meta box title', 'anno'), 'anno_subtitle_meta_box', 'article', 'normal', 'high');
	add_meta_box('excerpt-meta-box', _x('Abstract', 'Meta box title', 'anno'), 'anno_abstract_meta_box', 'article', 'normal', 'high');
	add_meta_box('content-meta-box', _x('Article', 'Meta box title', 'anno'), 'anno_body_meta_box', 'article', 'normal', 'high');
	add_meta_box('references', _x('References', 'Meta box title', 'anno'), 'anno_references_meta_box', 'article', 'normal', 'high');
	add_meta_box('funding', _x('Funding Statement', 'Meta box title', 'anno'), 'anno_funding_meta_box', 'article', 'normal', 'high');
	add_meta_box('acknowledgements', _x('Acknowledgements', 'Meta box title', 'anno'), 'anno_acknowledgements_meta_box', 'article', 'normal', 'high');
	add_meta_box('featured', _x('Featured', 'Meta box title', 'anno'), 'anno_featured_meta_box', 'article', 'side', 'default');

	if (!empty($appendices)) {
		add_meta_box('appendices', _x('Appendices', 'Meta box title', 'anno'), 'anno_appendices_meta_box', 'article', 'normal', 'high');
	}

	if (current_user_can('editor') || current_user_can('administrator')) {
		add_meta_box('convert', _x('Convert To Post', 'Meta box title', 'anno'), 'anno_convert_meta_box', 'article', 'side', 'low');
		// Dont load the DOI meta box on brand new articles, guid has not been generated yet to generate the DOI
		if ($article->post_status != 'auto-draft') {
			add_meta_box('doi-deposit', _x('DOI Deposit', 'Meta box title', 'anno'), 'anno_deposit_doi_meta_box', 'article', 'side', 'low');
		}
	}
}
add_action('add_meta_boxes_article', 'anno_article_meta_boxes');

function anno_subtitle_meta_box($post) {
	$html = get_post_meta($post->ID, '_anno_subtitle', true);
?>
	<input type="text" name="anno_subtitle" value="<?php echo esc_attr($html); ?>" style="width:100%;" />
<?php
}

/**
 * Body meta box markup (stored in content)
 */
function anno_body_meta_box( $post ) {
	global $hook_suffix;
	if ( empty( $post->post_content ) || $hook_suffix == 'post-new.php' ) {
		$article_template = trim( cfct_get_option( 'article_template' ) );
		if ( ! empty( $article_template ) ) {
			$content = anno_process_article_template( $article_template );
		} else {
			$content = '<sec>
				<title></title>
				<p>&#xA0;</p>
			</sec>';
		}
	} else {
		$content = $post->post_content;
	}

	if ( function_exists( 'wp_editor' ) ) {
		anno_load_editor( anno_process_editor_content( $content ), 'content', array( 'textarea_name' => 'content' ) );
	}
	else {
		echo '<p style="padding:0 10px;">' . sprintf( _x( 'The Annotum editor requires at least WordPress 3.3. It appears you are using WordPress %s. ', 'WordPress version error message', 'anno' ), get_bloginfo( 'version' ) ) . '</p>';
	}
?>

<aside class="js-content-tree-pop-up tree-pop-up hidden">
	<div id="anno-tree-close" class="js-anno-tree-close"></div>
	<div id="anno-tree-excerpt">
	</div>
	<div id="anno-tree-content">
	</div>
</aside>
<?php
}

/**
 * References meta box markup
 */
function anno_references_meta_box($post) {
	$references = get_post_meta($post->ID, '_anno_references', true);
	if (!empty($references) && is_array($references)) {
		foreach ($references as $ref_key => $reference) {
			$ref_key_display = $ref_key + 1;
?>
	<div><?php echo esc_html($ref_key_display . '. '. $reference['text']); ?></div>
<?php
		}
	}
}

/**
 * Abstract meta box markup (stored in excerpt)
 */
function anno_abstract_meta_box($post) {
	// FIXME: hack because excerpt comes out encoded
	if (empty($post->post_excerpt)) {
		$post->post_excerpt = '&lt;p&gt;&amp;#xA0;&lt;/p&gt;';
	}
	else if (html_entity_decode($post->post_excerpt) == $post->post_excerpt) {
		$post->post_excerpt = '&lt;p&gt;'.$post->post_excerpt. '&lt;/p&gt;';
	}

	anno_load_editor(anno_process_editor_content(html_entity_decode($post->post_excerpt)), "excerpt",
		array(
			'editor_class' => esc_attr('anno-meta anno-meta-abstract'),
			'textarea_name' => esc_attr('excerpt'),
			'textarea_rows' => esc_attr('8')
		)
	);
}
add_filter('get_the_excerpt', 'anno_xml_to_html');


/**
 * Funding meta box markup
 */
function anno_funding_meta_box($post) {
	$html = get_post_meta($post->ID, '_anno_funding', true);
?>
	<textarea class="anno-meta anno-meta-funding" name="anno_funding"><?php echo esc_textarea($html); ?></textarea>
<?php
}

/**
 * Acknowledgements meta box markup
 */
function anno_acknowledgements_meta_box($post) {
	$html = get_post_meta($post->ID, '_anno_acknowledgements', true);
?>
	<textarea id="guy" class="anno-meta anno-meta-acknowledgements" name="anno_acknowledgements"><?php echo esc_textarea($html); ?></textarea>
<?php
}

/**
 * Meta box markup for featuring an article in the featured carousel
 */
function anno_featured_meta_box($post) {
	$checked = get_post_meta($post->ID, '_anno_featured', true);
?>
	<input id="anno-featured" type="checkbox" value="on" name="anno_featured"<?php checked($checked, 'on', true); ?> />
	<label for="anno-featured"><?php _ex('Appear in the home page carousel', 'Featured post meta box label', 'anno'); ?></label>
<?php
}

/**
 * Save post meta related to an article
 */
function anno_article_save_post($post_id, $post) {
	if ($post->post_type == 'article') {
		$anno_meta = array(
			'anno_subtitle',
			'anno_funding',
			'anno_acknowledgements',
			'anno_featured'
		);
		foreach ($anno_meta as $key) {
			if ( isset($_POST[$key]) || $key == 'anno_featured' ) {
				switch ($key) {
					case 'anno_featured':
						if (isset($_POST['anno_featured']) && $_POST['anno_featured'] == 'on') {
							$value = 'on';
						}
						else {
							$value = 'off';
						}
						// Reset the transient if this is a published article
						if ($post->post_status == 'publish') {
							delete_transient('anno_featured');
						}
						break;
					case 'anno_subtitle':
					case 'anno_funding':
					case 'anno_acknowledgements':
					default:
						if (isset($_POST[$key])) {
							$value = force_balance_tags($_POST[$key]);
						}
						else {
							$value = '';
						}
						break;
				}
				update_post_meta($post_id, '_'.$key, $value);
			}
		}

		$appendices = array();
		if (isset($_POST['anno_appendix']) && is_array($_POST['anno_appendix'])) {
			foreach ($_POST['anno_appendix'] as $appendix) {
				if (!anno_is_appendix_empty($appendix)) {
					$appendices[] = addslashes(anno_validate_xml_content_on_save(stripslashes($appendix)));
				}
			}
			update_post_meta($post_id, '_anno_appendices', $appendices);
		}
	}
}
add_action('wp_insert_post', 'anno_article_save_post', 10, 2);

/**
 * Checks to see if a content block is empty or contains the default markup
 *
 * @param string $appendix_content Content sent from the editor
 * @return bool true if there exists content other than the default, false otherwise.
 */
function anno_is_appendix_empty($appendix_content) {
	// Account for variations in how different browsers handle empty tags in tinyMCE
	$appendix_content = str_replace(array(' ', ' ', '&nbsp', '\n', '<br>', '<br />'), '', $appendix_content);
	if (empty($appendix_content) || $appendix_content == '<sec><title></title><p></p></sec>') {
		return true;
	}

	return false;
}

/**
 * Converts a post with the article post-type to the post post-type
 *
 * @param int $post_id The ID of the post to convert
 * @return void
 */
function anno_article_to_post($post_id) {
	$post = get_post(absint($post_id), ARRAY_A);
	if ($post['post_type'] != 'article') {
		return;
	}

	// Convert the taxonomies before inserting so we don't get default categories assigned.
	$taxonomy_conversion = array(
		'article_tag' => 'post_tag',
		'article_category' => 'category',
	);
	foreach ($taxonomy_conversion as $from_tax => $to_tax) {
		anno_convert_taxonomies($post['ID'], $from_tax, $to_tax);
	}

	$post['post_type'] = 'post';
	$post['post_category'] = wp_get_post_categories($post['ID']);
	$post['tags_input'] = wp_get_post_tags($post['ID'], array('fields' => 'names'));

	$post_id = wp_insert_post($post);
}

/**
 * Converts a post's terms from one taxonomy to another.
 *
 * @param int $post_id The id of the post to convert the terms for
 * @param String $from_tax The original taxonomy of the term
 * @param String $to_tax The taxonomy to convert the term to
 */
function anno_convert_taxonomies($post_id, $from_tax, $to_tax) {
	$post_terms = wp_get_object_terms($post_id, $from_tax);
	if (is_array($post_terms)) {
		$new_terms = array();
		foreach ($post_terms as $term) {
			$term_id = anno_convert_term($term, $from_tax, $to_tax);
			$new_terms[] = (int) $term_id;
		}
		wp_set_object_terms($post_id, $new_terms, $to_tax, true);
	}
 	wp_set_object_terms($post_id, array(), $from_tax, false);
}

/**
 * Converts a term and all its ancestors from one taxonomy to another
 *
 * @param Term Object $term The original term to convert
 * @param String $from_tax The original taxonomy of the term
 * @param String $to_tax The taxonomy to convert the term to
 * @return int The ID of the newly converted term.
 */
function anno_convert_term($term, $from_tax, $to_tax) {
	if (!empty($term->parent)) {
		$parent_term = get_term($term->parent, $from_tax);
		$new_parent_id = anno_convert_term($parent_term, $from_tax, $to_tax);
		if (!term_exists($term->name, $to_tax)) {
			$term_data = wp_insert_term($term->name, $to_tax, array('parent' => $new_parent_id));
			$term_id = $term_data['term_id'];
		}
		else {
			$term = get_term_by('slug', $term->slug, $to_tax);
			$term_id = $term->term_id;
		}
	}
	else {
		if (!term_exists($term->name, $to_tax)) {
			$term_data = wp_insert_term($term->name, $to_tax);
			$term_id = $term_data['term_id'];
		}
		else {
			$term = get_term_by('slug', $term->slug, $to_tax);
			$term_id = $term->term_id;
		}
	}
	return $term_id;
}

/**
 * Markup for the convert mechanism meta box
 */
function anno_convert_meta_box($post) {
?>
	<p>
	<?php _ex('Clicking the button below will convert the current <strong>Article</strong> to a <strong>Post</strong>. This will also convert any terms in article taxonomies to post taxonomies. You will not be able to revert this Article back once it has been converted to a Post.', 'conversion instructions', 'anno'); ?>
	</p>
	<p style="text-align: center;">
		<?php wp_nonce_field('anno_convert', 'anno_convert_nonce', true, true); ?>
		<input type="submit" name="anno_convert" class="button-primary" value="Convert To Post" />
	</p>

<?php
}

/**
 * Markup for depositing
 */
function anno_deposit_doi_meta_box($post) {
	$crossref_login = cfct_get_option('crossref_login');
	$crossref_password = cfct_get_option('crossref_pass');
	$crossref_registrant = cfct_get_option('registrant_code');

	if (empty($crossref_login) || empty($crossref_password) || empty($crossref_registrant)) {
		$deposit_enabled = false;
		$deposit_value = _x('CrossRef Credentials Required', 'disabled DOI lookup message', 'anno');
		$deposit_id = 'doi-deposit-disabled';
	}
	else {
		$deposit_enabled = true;
		$deposit_value = anno_get_doi($post->ID);
		$deposit_id = 'doi-deposit-submit';
	}

?>
	<div id="doi-status"></div>
	<input id="doi" type="text" name="doi-deposit" class="meta-doi-input" value="<?php echo $deposit_value; ?>"<?php disabled(true, true, true); ?> />
	<?php wp_nonce_field('anno_doi_deposit', '_ajax_nonce-doi-deposit', false); ?>
	<!-- <input id="<?php echo $deposit_id; ?>" type="button" value="<?php _ex('Deposit', 'doi deposit button label', 'anno'); ?>"<?php disabled($deposit_enabled, false, true); ?> /> -->
<?php
}

function anno_appendices_meta_box($post) {
	echo '<div class="inside">
			<p>'.__('Appendices have changed in Annotum 2.0, if you would like to continue using them please copy the appendix content below, open the code view
		in the body section and paste it in at the bottom then delete that appendix. Please note that all content pasted into the body must be contained in a <code>&lt;sec&gt;  &lt;/sec&gt;</code> block.
		 Appendices will continue to be output as normal if you do nothing.', 'anno').'</p>
			<hr />';

	$appendices = get_post_meta($post->ID, '_anno_appendices', true);
	if (!empty($appendices) && is_array($appendices)) {
		foreach ($appendices as $index => $content) {
			echo '<div class="'.esc_attr('js-appendix-'.$index).'">';
			echo '<h3>'.sprintf(__('Appendix %s - ', 'anno'), $index + 1).' <a href="#" class="js-delete-appendix" data-index="'.esc_attr($index).'">'._x('delete', 'delete appendix text', 'anno').'</a></h3>';
			echo '<textarea class="js-textarea anno-meta" disabled rows="10">'.esc_textarea($content).'</textarea>';
			echo '</div>';
			//$html .= anno_appendix_box_content($index + 1, $content);
		}
		wp_nonce_field('appendex-delete-nonce', 'appendex-delete-nonce', false, true);
	}
	echo '</div>';
}

function anno_delete_appendix_ajax() {
	$result = 'false';
	if (check_ajax_referer('appendex-delete-nonce', 'nonce', false)) {
		$appendix_index = isset($_POST['index']) ? $_POST['index'] : false;
		$post_id = isset($_POST['post_id']) ? $_POST['post_id'] : false;
		if ($appendix_index !== false && !empty($post_id)) {
			$appendix_meta = get_post_meta($post_id, '_anno_appendices', true);
			if (isset($appendix_meta[$appendix_index])) {
				unset($appendix_meta[$appendix_index]);
				if (update_post_meta($post_id, '_anno_appendices', $appendix_meta)) {
					$result = 'true';
				}
			}
		}
	}
	echo $result;
	die();
}
add_action('wp_ajax_anno_delete_appendix', 'anno_delete_appendix_ajax');

function anno_process_article_template( $article_template ) {
	$markup = '';

	// Catch the escaped commas
	$escape_token = ' ####comma#### ';
	$article_template = str_replace( '/,', $escape_token, $article_template );
	$sections = explode( ',', $article_template );

	foreach ( $sections as $section_title ) {
		$markup .= '
			<sec>
				<title>' . str_replace( $escape_token, ',', trim( $section_title ) ) . '</title>
				<p>&#xA0;</p>
			</sec>';
	}

	if ( empty( $markup ) ) {
		$markup = '<sec>
				<title></title>
				<p>&#xA0;</p>
			</sec>';
	}

	return $markup;
}
