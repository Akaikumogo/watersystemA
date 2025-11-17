import { motion } from 'framer-motion'

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -20,
  },
}

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.4,
}

export const withPageTransition = <P extends object>(Component: React.ComponentType<P>) => {
  const WrappedComponent = (props: P) => {
    return (
      <motion.div
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
        className="w-full"
      >
        <Component {...props} />
      </motion.div>
    )
  }
  
  WrappedComponent.displayName = `withPageTransition(${Component.displayName || Component.name || 'Component'})`
  
  return WrappedComponent
}

