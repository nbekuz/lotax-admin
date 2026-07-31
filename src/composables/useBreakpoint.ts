import { computed, onMounted, onUnmounted, ref } from 'vue'

export function useBreakpoint() {
  const width = ref(typeof window !== 'undefined' ? window.innerWidth : 1440)

  function update() {
    width.value = window.innerWidth
  }

  onMounted(() => {
    update()
    window.addEventListener('resize', update, { passive: true })
  })

  onUnmounted(() => {
    window.removeEventListener('resize', update)
  })

  const isMobile = computed(() => width.value < 768)
  const isTablet = computed(() => width.value >= 768 && width.value < 1200)
  const isLaptop = computed(() => width.value >= 1200 && width.value < 1440)
  const isDesktop = computed(() => width.value >= 1440)
  const isMdUp = computed(() => width.value >= 768)
  const isLgUp = computed(() => width.value >= 1200)

  return {
    width,
    isMobile,
    isTablet,
    isLaptop,
    isDesktop,
    isMdUp,
    isLgUp,
  }
}
