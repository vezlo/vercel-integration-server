export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">Vercel Integration Server</span>
            </div>
            <nav className="hidden md:flex items-center space-x-6">
              <a href="/api-docs" className="text-gray-600 hover:text-gray-900 transition-colors">
                Documentation
              </a>
              <a href="https://vezlo.org" className="text-gray-600 hover:text-gray-900 transition-colors">
                About Vezlo
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Deploy AI Assistant Server
            <br />
            <span className="text-gray-600 mt-4 block">to Vercel in Minutes</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed">
            Enterprise-grade integration server that securely deploys AI Assistant Server 
            to your Vercel account with OAuth authentication and automated configuration.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://vercel.com/marketplace/vezlo-assistant-server"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center bg-black text-white px-8 py-4 rounded-lg hover:bg-gray-800 transition-all duration-200 font-medium text-lg shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Install from Vercel Marketplace
            </a>
            <a
              href="/api-docs"
              className="inline-flex items-center bg-white text-gray-900 px-8 py-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 font-medium text-lg"
            >
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View API Documentation
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Enterprise Features</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Built with security, scalability, and ease of use in mind
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="text-center p-8 rounded-xl border border-gray-100 hover:border-gray-200 transition-all duration-200">
              <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Secure OAuth</h3>
              <p className="text-gray-600 leading-relaxed">
                Enterprise-grade security with AES-256 encrypted token storage and secure OAuth 2.0 authentication flow
              </p>
            </div>
            
            <div className="text-center p-8 rounded-xl border border-gray-100 hover:border-gray-200 transition-all duration-200">
              <div className="w-16 h-16 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Automated Deployment</h3>
              <p className="text-gray-600 leading-relaxed">
                One-click deployment of AI Assistant Server directly to your Vercel projects with environment configuration
              </p>
            </div>
            
            <div className="text-center p-8 rounded-xl border border-gray-100 hover:border-gray-200 transition-all duration-200">
              <div className="w-16 h-16 bg-purple-50 rounded-xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Easy Configuration</h3>
              <p className="text-gray-600 leading-relaxed">
                Intuitive web interface for configuring Supabase and OpenAI credentials with validation
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Simple Integration Process</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Get your AI Assistant Server running in just 4 simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-white font-bold text-2xl">1</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Install</h4>
              <p className="text-gray-600 text-sm leading-relaxed">Install the integration from Vercel Marketplace</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-white font-bold text-2xl">2</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Configure</h4>
              <p className="text-gray-600 text-sm leading-relaxed">Enter your Supabase and OpenAI credentials</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-white font-bold text-2xl">3</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Deploy</h4>
              <p className="text-gray-600 text-sm leading-relaxed">Deploy AI Assistant Server to your Vercel account</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-white font-bold text-2xl">4</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Complete</h4>
              <p className="text-gray-600 text-sm leading-relaxed">Your AI Assistant is ready to use!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-gray-900 text-white">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            {/* Brand */}
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
                  <span className="text-gray-900 font-bold text-sm">V</span>
                </div>
                <span className="text-xl font-semibold">Vezlo</span>
              </div>
              <p className="text-gray-400 leading-relaxed">
                Enterprise-grade integration solutions for modern development teams.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Resources</h4>
              <div className="space-y-3">
                <a href="/api-docs" className="block text-gray-400 hover:text-white transition-colors">
                  API Documentation
                </a>
                <a href="https://vercel.com/marketplace/vezlo-assistant-server" className="block text-gray-400 hover:text-white transition-colors">
                  Vercel Marketplace
                </a>
                <a href="https://github.com/vezlo/vercel-integration-server" className="block text-gray-400 hover:text-white transition-colors">
                  GitHub Repository
                </a>
              </div>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-lg font-semibold mb-4">Company</h4>
              <div className="space-y-3">
                <a href="https://vezlo.org" className="block text-gray-400 hover:text-white transition-colors">
                  About Vezlo
                </a>
                <a href="https://vezlo.org/contact" className="block text-gray-400 hover:text-white transition-colors">
                  Contact Us
                </a>
                <a href="https://vezlo.org/privacy" className="block text-gray-400 hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400">
              © 2025 Vezlo. All rights reserved. Made with ❤️ for developers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
