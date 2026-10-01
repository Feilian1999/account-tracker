<template>
  <!-- Expense is the base; income is water filling in from the left, with a
       flowing, slanted surface where the two meet. -->
  <div
    class="water-bar relative h-3.5 overflow-hidden rounded-full shadow-inner"
    :class="share === null ? 'bg-white/20' : 'water-expense'"
    role="img"
    :aria-label="label"
  >
    <div
      v-if="share !== null && share > 0.001"
      class="absolute inset-y-0 left-0"
      :class="{ 'fill-transition': animate }"
      :style="{ width: `${share * 100}%` }"
    >
      <!-- The body runs right under the surface, its right edge slanted like
           the surface (full width at the top, 5px short at the bottom), so no
           square corner shows past the wave and the shine can travel all the
           way to the water's edge. -->
      <div
        class="water-income absolute inset-0"
        :style="{ clipPath: bodyClip }"
      ></div>

      <!-- The surface, centred on the fill's right edge and slanted. Hidden
           when income is everything (there is no boundary to show). -->
      <div
        v-if="hasSurface"
        class="edge pointer-events-none absolute inset-y-0"
        :style="{ left: '100%', '--wl': `${wave.wavelength}px` }"
        aria-hidden="true"
      >
        <svg
          class="wave wave-front water-surface absolute top-0 left-0 overflow-visible"
          :class="{ flowing: animate }"
          :width="1"
          :height="strip"
        >
          <path :d="frontPath" fill="currentColor" />
        </svg>
      </div>

      <!-- A glint travelling through the water, drawn over the surface strip
           but clipped like the body, so it reaches the edge and never the red. -->
      <div
        v-if="animate"
        class="pointer-events-none absolute inset-0 overflow-hidden"
        :style="{ clipPath: bodyClip }"
        aria-hidden="true"
      >
        <div class="shine absolute inset-y-0 left-0 w-1/3"></div>
      </div>
    </div>

    <!-- A soft sheen across the top, so the bar reads as a surface. -->
    <div
      class="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-white/15"
      aria-hidden="true"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { stripHeight, wavePath } from "../../utils/waterBar";

const props = defineProps<{
  /** Income share 0…1, or null when there is nothing to show. */
  share: number | null;
  /** Off when the user disabled animations: the surface rests, unmoving. */
  animate: boolean;
  label: string;
}>();

// No boundary when income is everything; then the body runs to the end.
// The surface needs room: at the very ends its fixed width (reach + slant +
// wave ≈ 10px) would overstate a tiny share, or nibble a near-full one. There
// the fill is a plain bar, so a share always looks like its true size.
const hasSurface = computed(
  () => props.share !== null && props.share >= 0.03 && props.share <= 0.97,
);
const bodyClip = computed(() =>
  hasSurface.value
    ? "polygon(0 0, 100% 0, calc(100% - 5px) 100%, 0 100%)"
    : "none",
);

// 14px tall bar (h-3.5); a 10px wavelength gives ~1½ crests across it.
// The 18° slant shifts the surface ±2.3px top to bottom, so the body's slanted
// clip ends 5px short at the bottom and the strip's fill only needs to reach
// 6px behind the surface (any more would hide the shine near the end).
const wave = { height: 14, wavelength: 10, amplitude: 1.8, reach: 6 };
const strip = stripHeight(wave);
const frontPath = wavePath(wave);
</script>

<style scoped>
/* Income/expense colours, re-coloured for the sheep theme like the rest of the
   app's income (sage) and expense (terracotta). The header behind the bar has
   the same gradient in dark mode, so these need no dark variant. */
.water-expense {
  background-image: linear-gradient(
    to right,
    var(--expense-from),
    var(--expense-to)
  );
}
.water-income {
  background-image: linear-gradient(
    to right,
    var(--income-from),
    var(--income-to)
  );
}
.water-surface {
  color: var(--income-to);
}
.water-bar {
  --income-from: #34d399; /* emerald-400 */
  --income-to: #14b8a6; /* teal-500 */
  --expense-from: #f43f5e; /* rose-500 */
  --expense-to: #ef4444; /* red-500 */
}
/* The whole selector goes inside :global() — Vue compiles
   `:global(x) .water-bar` to just `x`, dropping the rest. `html.…` outranks
   the scoped `.water-bar[data-v-…]` above. */
:global(html.theme-sheep .water-bar) {
  --income-from: #b5c29e;
  --income-to: #a3b18a;
  --expense-from: #b45d52;
  --expense-to: #a44a3f;
}

.fill-transition {
  transition: width 0.7s ease-out;
}

/* Slant the whole surface; the fill reaches left of the edge (wavePath's
   `reach`) so the skew never opens a gap against the green body. */
.edge {
  transform: skewX(-18deg);
}

/* Slide the strip up by exactly one wavelength and loop: seamless flow. */
.wave.flowing {
  animation: flow linear infinite;
}
.wave-front.flowing {
  animation-duration: 1.8s;
}
@keyframes flow {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(calc(-1 * var(--wl)));
  }
}

/* A slow glint travelling through the water. */
.shine {
  background: linear-gradient(
    100deg,
    rgb(255 255 255 / 0) 0%,
    rgb(255 255 255 / 0.28) 50%,
    rgb(255 255 255 / 0) 100%
  );
  animation: shine 5s linear infinite;
}
/* Glide all the way past the end (320% of a third = beyond the full width),
   then rest out of sight before the next pass — it never stops mid-water. */
@keyframes shine {
  0% {
    transform: translateX(-120%);
  }
  65%,
  100% {
    transform: translateX(320%);
  }
}

/* The surface rests and the glint is gone (a frozen glint would read as a
   stray white band); the fill jumps instead of sliding. */
@media (prefers-reduced-motion: reduce) {
  .wave.flowing {
    animation: none;
  }
  .shine {
    display: none;
  }
  .fill-transition {
    transition: none;
  }
}
</style>
