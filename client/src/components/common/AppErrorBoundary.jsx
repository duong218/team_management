import { Component } from "react";

export default class AppErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("Lỗi giao diện Ocean and Gem:", error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="app-crash" role="alert">
        <section>
          <h1>Trang gặp sự cố</h1>
          <p>Hãy tải lại trang. Nếu lỗi tiếp tục, thử lại sau ít phút.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Tải lại trang
          </button>
        </section>
      </main>
    );
  }
}
