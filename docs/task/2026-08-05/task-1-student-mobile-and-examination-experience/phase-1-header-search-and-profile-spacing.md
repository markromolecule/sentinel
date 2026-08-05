# Task 1 — Phase 1: Header Search and Profile Spacing

**Goal:** Keep the student mobile-header avatar inside the viewport and make the expanded global-search panel use the intended mobile width.

- [ ] Update `app/sentinel-web/src/components/sidebar/student/StudentHeader.tsx` so its mobile container and action group apply consistent horizontal viewport padding and retain a tappable right inset for the profile menu trigger.
- [ ] Update the icon-only branch of `app/sentinel-web/src/components/common/user-search-bar.tsx` so the Radix popover width and alignment are calculated from the mobile viewport rather than ending at the search trigger/avatar boundary; retain the existing desktop width behavior.
- [ ] Extend `app/sentinel-web/src/components/sidebar/student/student-header.test.tsx` to assert the mobile header retains the expected horizontal inset and profile-menu trigger.
- [ ] Extend `app/sentinel-web/src/components/common/user-search-bar.test.tsx` to assert the icon-only search popover uses the mobile full-width class and still renders the search input, recent-search state, and result state.
- [ ] Manually verify the states shown in `IMG_3512.PNG` and `IMG_3513.PNG` at the iPhone viewport used for the report: closed header, profile menu open, and global search open with the keyboard present.

**Migration required:** No — this phase changes only `sentinel-web` layout classes and component tests.
