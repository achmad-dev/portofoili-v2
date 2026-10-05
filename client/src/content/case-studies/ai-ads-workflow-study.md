# AI-Assisted Ad Creative and Landing Page Workflow

At Alivate, I worked on an AI-assisted workflow that turns an approved campaign strategy into ad concepts, image-generation jobs, and landing-page plans. The goal was to make creative production easier to review and more reliable without treating an LLM as the source of every decision.

**My role:** AI Lead Engineer and Software Engineer. I worked on the workflow architecture, agent responsibilities, Go orchestration, reference selection, creative-quality controls, and landing-page planning.

**Stack:** Go, LLM agents, multimodal image generation, structured JSON/YAML contracts, reference metadata, and Meta Pixel-ready tracking.

## The problem

Generating one attractive ad is relatively easy. Producing a useful set of ads for a real campaign requires answers to harder questions:

- Which audience and campaign angle is each creative for?
- Which claims are supported by approved business information?
- How can a reference guide the design without being copied?
- How much text can the chosen layout hold?
- What should a campaign manager review before image generation begins?
- How should the ad, landing page, and conversion tracking fit together?

An early workflow passed business context directly to a creative agent and then generated an image. When an output was weak, it was difficult to tell whether the cause was the strategy, message, reference, layout, or image prompt. I separated those decisions into stages with explicit outputs.

## How the workflow works

```text
Approved business context
        ↓
Campaign plan and angles
        ↓
Reference selection
        ↓
Message concept and supported claims
        ↓
Structured image job
        ↓
Image generation and creative review

Campaign plan → Landing-page direction → Review → Page generation → Tracking QA
```

The campaign plan is a review point. It can describe the objective, audience, ad sets, approved angles, captions, calls to action, selected references, planned image jobs, and optional landing-page direction. A manager can inspect those decisions before generation work begins.

### References guide design, not facts

I used reference metadata to narrow a larger creative library to a small, relevant set. Metadata can describe the layout, visual hierarchy, copy density, aspect ratio, and suitable use cases. Selecting a reference **before** final copy helps the message fit the design: a layout with room for a short headline should not receive a paragraph and several proof points.

I encountered two opposing failure modes:

- **Reference drift:** the output looked polished but lost the useful design qualities of the chosen reference.
- **Reference cloning:** stronger guidance produced an ad that looked too much like the reference with its logo and text replaced.

The revised approach treats a reference as guidance for hierarchy, whitespace, and information density. The final composition, imagery, and brand treatment still need to be original.

### Claims come from approved inputs

The message stage uses approved campaign and business information for public-facing claims. A reference can constrain the *shape* of the message, but it cannot supply product facts, offers, testimonials, or statistics. Keeping those sources separate makes it easier to review a claim and trace it back to its origin.

### Image jobs make production reviewable

I used a structured image job to connect the approved message, selected reference, brand assets, aspect ratio, and production constraints. The example below illustrates the contract; it is not a client campaign record.

```json
{
  "angle_id": "angle_01",
  "status": "planned",
  "reference": {
    "id": "ref_0045",
    "preserve": ["visual hierarchy", "clear CTA"],
    "reinterpret": ["composition", "hero imagery"]
  },
  "copy": {
    "headline": "Approved headline",
    "supporting_copy": "Approved supporting message",
    "cta": "Approved CTA"
  },
  "brand_assets": {
    "logo": "approved-logo.png"
  }
}
```

The job gives the production stage a bounded task. It also makes failures easier to locate: the team can inspect the plan, message, reference, job, and generated asset separately.

### Creative review checks more than appearance

Review criteria include readability, message fidelity, audience relevance, brand fit, originality, and CTA clarity. Some problems are hard failures, such as unsupported claims, incorrect approved copy, an unreadable headline, a missing CTA, or excessive similarity to a reference. A single aesthetic score would hide those differences.

### Landing pages and tracking follow the same boundaries

The landing-page path starts with a plan for the conversion goal, hero message, sections, proof, form, and tracking intent. Page generation is optional: some campaigns already have a destination page.

The AI can describe events such as page views, CTA clicks, form starts, and leads. Application code is responsible for stable element IDs and tracking injection. This keeps Meta Pixel behavior out of free-form generated JavaScript. Meta Conversions API support remains a possible future extension.

## What changed during iteration

| Problem | Change |
| --- | --- |
| Creative output drifted from a useful reference | Added structured reference metadata and a selection step before final copy. |
| Stronger reference guidance led to near copies | Reframed references as design guidance and required original composition. |
| Good campaign copy did not fit the image | Added copy-capacity constraints to reference selection. |
| Agents made overlapping decisions | Gave planning, messaging, reference selection, and production separate responsibilities. |
| Tracking logic was too variable | Kept event intent in the plan and implementation in application code. |

## Outcome and lessons

The workflow evolved from a direct image-generation experiment into a staged system with reviewable plans, traceable messages, structured image jobs, optional landing-page planning, and clearer quality checks. Separating planning from production made the work easier to inspect before spending on generation and easier to debug when an output missed the mark.

The main lesson for me was to use LLMs where interpretation and creative reasoning help, while keeping validation, job assembly, lifecycle state, and tracking behavior deterministic.
