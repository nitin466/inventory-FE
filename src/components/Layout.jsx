import './Layout.css'

function Layout({ children }) {
  return (
    <div className="layout">
      <header className="layout__header">
        <h2 className="layout__title">App</h2>
      </header>
      <div className="layout__content">
        {children}
      </div>
    </div>
  )
}

export default Layout
