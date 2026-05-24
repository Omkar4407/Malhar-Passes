import Menu from "../components/Menu";
import Header from "../components/Header";
import MyTicketsList from "../components/MyTicketsList";

export { bustTicketsCache } from "../lib/tickets";

export default function Ticket() {
  return (
    <>
      <Menu />
      <Header />
      <div style={styles.page}>
        <h1 style={styles.pageTitle}>My Tickets</h1>
        <MyTicketsList compact />
      </div>
    </>
  );
}

const styles = {
  page: {
    padding: "20px",
    maxWidth: "560px",
    margin: "0 auto",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: "#1a1a1a",
  },
  pageTitle: {
    fontSize: "22px",
    fontWeight: 800,
    margin: "0 0 16px",
    letterSpacing: "-0.02em",
  },
};
