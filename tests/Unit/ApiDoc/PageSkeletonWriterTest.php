<?php

declare(strict_types=1);

namespace Tests\Unit\ApiDoc;

use Gz168\ApiDoc\Layout\LayoutTreeDefaults;
use Gz168\ApiDoc\Layout\PageSkeletonWriter;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class PageSkeletonWriterTest extends TestCase
{
    #[Test]
    public function orders_non_section_parts_and_hides_note_by_default(): void
    {
        $html = app(PageSkeletonWriter::class)->write(LayoutTreeDefaults::tree());
        $this->assertStringContainsString("api_doc_part('header'", $html);
        $this->assertStringNotContainsString("api_doc_part('note'", $html);
        $posHeader = strpos($html, "api_doc_part('header'");
        $posNav = strpos($html, "api_doc_part('nav'");
        $this->assertTrue($posHeader < $posNav);
    }

    #[Test]
    public function hides_carriers_when_not_visible(): void
    {
        $tree = LayoutTreeDefaults::tree();
        foreach ($tree['nodes'] as &$n) {
            if ($n['part'] === 'carriers_section') {
                $n['visible'] = false;
            }
        }
        unset($n);
        $html = app(PageSkeletonWriter::class)->write($tree);
        $this->assertStringNotContainsString("api_doc_part('carriers_section'", $html);
    }

    #[Test]
    public function omits_sections_loop_when_both_intro_and_api_hidden(): void
    {
        $tree = LayoutTreeDefaults::tree();
        foreach ($tree['nodes'] as &$n) {
            if (in_array($n['part'], ['intro_section', 'api_section'], true)) {
                $n['visible'] = false;
            }
        }
        unset($n);
        $html = app(PageSkeletonWriter::class)->write($tree);
        $this->assertStringNotContainsString('@foreach ($data[\'sections\']', $html);
    }
}
