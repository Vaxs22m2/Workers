import Image from "next/image";
import styles from "./page.module.css";
import Header from "../components/Header/Header";
import Hero from "../components/Hero/Hero";
import Stats from "@/components/Stats/Stats";
import Categories from "@/components/Categories/Categories";
import Footer from "@/components/Footer/Footer";

export default function Home() {
  return (
    <div className={styles.page}>
 <Header />
 <Hero />
 <Stats />
 <Categories/>
 <Footer />
    </div>
  );
}
