import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Table, Column } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { formatDate } from '@/lib/format';
import type { HeroSlide, Review, BlogPost, FAQ, MediaAsset, ProductCategory, Subcategory, NavigationItem } from '@/types';
import {
  Globe,
  Sliders,
  FileText,
  HelpCircle,
  Star,
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Upload,
  FolderTree,
  Layout,
  Navigation,
} from 'lucide-react';

export const WebsitePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('hero');

  // Modals state
  const [editingHero, setEditingHero] = useState<HeroSlide | null>(null);
  const [isHeroModalOpen, setIsHeroModalOpen] = useState(false);
  const [deletingHero, setDeletingHero] = useState<HeroSlide | null>(null);

  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [deletingReview, setDeletingReview] = useState<Review | null>(null);

  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [deletingBlog, setDeletingBlog] = useState<BlogPost | null>(null);

  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [deletingFaq, setDeletingFaq] = useState<FAQ | null>(null);

  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<ProductCategory | null>(null);

  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [deletingSubcategory, setDeletingSubcategory] = useState<Subcategory | null>(null);

  const [editingNavItem, setEditingNavItem] = useState<NavigationItem | null>(null);
  const [isNavModalOpen, setIsNavModalOpen] = useState(false);
  const [deletingNavItem, setDeletingNavItem] = useState<NavigationItem | null>(null);

  const [editingPage, setEditingPage] = useState<any | null>(null);
  const [isPageModalOpen, setIsPageModalOpen] = useState(false);

  const [deletingMedia, setDeletingMedia] = useState<MediaAsset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Queries
  const { data: heroData, isLoading: heroLoading, refetch: refetchHero } = useQuery<{ slides: HeroSlide[] }>({
    queryKey: ['cms-hero-slides'],
    queryFn: async () => {
      const res = await apiClient.get('/cms/hero-slides');
      return res.data.data || res.data;
    },
    enabled: activeTab === 'hero',
  });

  const { data: reviewsData, isLoading: reviewsLoading, refetch: refetchReviews } = useQuery<{ reviews: Review[] }>({
    queryKey: ['cms-reviews'],
    queryFn: async () => {
      const res = await apiClient.get('/cms/reviews');
      return res.data.data || res.data;
    },
    enabled: activeTab === 'reviews',
  });

  const { data: blogsData, isLoading: blogsLoading, refetch: refetchBlogs } = useQuery<{ posts: BlogPost[] }>({
    queryKey: ['cms-blogs'],
    queryFn: async () => {
      const res = await apiClient.get('/cms/blog-posts');
      return res.data.data || res.data;
    },
    enabled: activeTab === 'blogs',
  });

  const { data: faqsData, isLoading: faqsLoading, refetch: refetchFaqs } = useQuery<{ faqs: FAQ[] }>({
    queryKey: ['cms-faqs'],
    queryFn: async () => {
      const res = await apiClient.get('/cms/faqs');
      return res.data.data || res.data;
    },
    enabled: activeTab === 'faqs',
  });

  const { data: categoriesData, isLoading: categoriesLoading, refetch: refetchCategories } = useQuery<{ categories: ProductCategory[] }>({
    queryKey: ['categories-full'],
    queryFn: async () => {
      const res = await apiClient.get('/categories');
      return res.data.data || res.data;
    },
    enabled: activeTab === 'categories',
  });

  const { data: pagesData, isLoading: pagesLoading, refetch: refetchPages } = useQuery<{ pages: any[] }>({
    queryKey: ['cms-pages'],
    queryFn: async () => {
      const res = await apiClient.get('/cms/pages');
      return res.data.data || res.data;
    },
    enabled: activeTab === 'pages',
  });

  const { data: navData, isLoading: navLoading, refetch: refetchNav } = useQuery<{ navigation: NavigationItem[] }>({
    queryKey: ['cms-navigation'],
    queryFn: async () => {
      const res = await apiClient.get('/cms/navigation');
      return res.data.data || res.data;
    },
    enabled: activeTab === 'navigation',
  });

  const { data: mediaData, isLoading: mediaLoading, refetch: refetchMedia } = useQuery<{ assets: MediaAsset[] }>({
    queryKey: ['media-assets'],
    queryFn: async () => {
      const res = await apiClient.get('/media');
      return res.data.data || res.data;
    },
    enabled: activeTab === 'media',
  });

  // Toggles
  const handleToggleHeroActive = async (slide: HeroSlide) => {
    try {
      await apiClient.put(`/cms/hero-slides/${slide.id}`, { isActive: !slide.isActive });
      refetchHero();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleReviewPublish = async (review: Review) => {
    try {
      await apiClient.put(`/cms/reviews/${review.id}`, { isPublished: !review.isPublished });
      refetchReviews();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleBlogPublish = async (post: BlogPost) => {
    try {
      await apiClient.put(`/cms/blog-posts/${post.id}`, { isPublished: !post.isPublished });
      refetchBlogs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFaqPublish = async (faq: FAQ) => {
    try {
      await apiClient.put(`/cms/faqs/${faq.id}`, { isPublished: !faq.isPublished });
      refetchFaqs();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Actions
  const handleDeleteHero = async () => {
    if (!deletingHero) return;
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/cms/hero-slides/${deletingHero.id}`);
      setDeletingHero(null);
      refetchHero();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!deletingReview) return;
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/cms/reviews/${deletingReview.id}`);
      setDeletingReview(null);
      refetchReviews();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBlog = async () => {
    if (!deletingBlog) return;
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/cms/blog-posts/${deletingBlog.id}`);
      setDeletingBlog(null);
      refetchBlogs();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFaq = async () => {
    if (!deletingFaq) return;
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/cms/faqs/${deletingFaq.id}`);
      setDeletingFaq(null);
      refetchFaqs();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await apiClient.delete(`/categories/${deletingCategory.id}`);
      setDeletingCategory(null);
      refetchCategories();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubcategory = async () => {
    if (!deletingSubcategory) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await apiClient.delete(`/categories/subcategories/${deletingSubcategory.id}`);
      setDeletingSubcategory(null);
      refetchCategories();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete subcategory.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNavItem = async () => {
    if (!deletingNavItem) return;
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/cms/navigation/${deletingNavItem.id}`);
      setDeletingNavItem(null);
      refetchNav();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMedia = async () => {
    if (!deletingMedia) return;
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/media/${deletingMedia.id}`);
      setDeletingMedia(null);
      refetchMedia();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Columns Definitions
  const heroColumns: Column<HeroSlide>[] = [
    {
      header: 'Slide Preview',
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <div className="h-12 w-20 rounded-md bg-graphite-100 overflow-hidden border border-graphite-200 shrink-0">
            <img src={row.image} alt={row.title} className="h-full w-full object-cover" />
          </div>
          <div>
            <p className="font-bold text-graphite-900">{row.title}</p>
            <p className="text-xs text-graphite-400">{row.tagline || 'No tagline'}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Target Link',
      accessor: (row) => <span className="text-xs font-mono text-graphite-600">{row.href}</span>,
    },
    {
      header: 'Sort Order',
      accessor: (row) => <span className="text-xs font-semibold text-graphite-700">{row.sortOrder}</span>,
    },
    {
      header: 'Status',
      accessor: (row) => (
        <button type="button" onClick={() => handleToggleHeroActive(row)} className="cursor-pointer">
          <StatusBadge status={row.isActive ? 'ACTIVE' : 'INACTIVE'} />
        </button>
      ),
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => { setEditingHero(row); setIsHeroModalOpen(true); }}>
            <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setDeletingHero(row)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const reviewColumns: Column<Review>[] = [
    {
      header: 'Client & Rating',
      accessor: (row) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-graphite-900">{row.name}</span>
            {row.verified && (
              <span className="rounded-full bg-emerald-50 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700">
                Verified
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5 text-amber-500 mt-0.5">
            {[...Array(row.rating)].map((_, i) => (
              <Star key={i} className="h-3 w-3 fill-current" />
            ))}
          </div>
        </div>
      ),
    },
    {
      header: 'Review Quote',
      accessor: (row) => (
        <p className="text-xs text-graphite-600 max-w-md truncate italic">"{row.quote}"</p>
      ),
    },
    {
      header: 'Product',
      accessor: (row) => <span className="text-xs text-graphite-600">{row.productName || 'General Brand'}</span>,
    },
    {
      header: 'Moderation Status',
      accessor: (row) => (
        <button type="button" onClick={() => handleToggleReviewPublish(row)} className="cursor-pointer">
          <StatusBadge status={row.isPublished ? 'PUBLISHED' : 'DRAFT'} />
        </button>
      ),
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => { setEditingReview(row); setIsReviewModalOpen(true); }}>
            <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setDeletingReview(row)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const blogColumns: Column<BlogPost>[] = [
    {
      header: 'Title & Slug',
      accessor: (row) => (
        <div>
          <p className="font-bold text-graphite-900">{row.title}</p>
          <p className="text-xs font-mono text-graphite-400">/blogs/{row.slug}</p>
        </div>
      ),
    },
    {
      header: 'Publish Status',
      accessor: (row) => (
        <button type="button" onClick={() => handleToggleBlogPublish(row)} className="cursor-pointer">
          <StatusBadge status={row.isPublished ? 'PUBLISHED' : 'DRAFT'} />
        </button>
      ),
    },
    {
      header: 'Date',
      accessor: (row) => <span className="text-xs text-graphite-500">{formatDate(row.createdAt)}</span>,
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => { setEditingBlog(row); setIsBlogModalOpen(true); }}>
            <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setDeletingBlog(row)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const faqColumns: Column<FAQ>[] = [
    {
      header: 'Question',
      accessor: (row) => <span className="font-bold text-graphite-900">{row.question}</span>,
    },
    {
      header: 'Category / Context',
      accessor: (row) => (
        <div className="text-xs">
          <span className="font-semibold text-graphite-700">{row.category?.name || 'General'}</span>
          <p className="text-[10px] text-graphite-400 uppercase tracking-wide">{row.context}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => (
        <button type="button" onClick={() => handleToggleFaqPublish(row)} className="cursor-pointer">
          <StatusBadge status={row.isPublished ? 'PUBLISHED' : 'DRAFT'} />
        </button>
      ),
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => { setEditingFaq(row); setIsFaqModalOpen(true); }}>
            <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setDeletingFaq(row)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website Content & CMS"
        description="Manage storefront content, hero carousel slides, customer reviews, journal blogs, pages, navigation, and media."
      />

      {errorMsg && (
        <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
          {errorMsg}
        </div>
      )}

      <Tabs
        tabs={[
          { id: 'hero', label: 'Hero Slides' },
          { id: 'categories', label: 'Categories & Subcategories' },
          { id: 'reviews', label: 'Customer Reviews' },
          { id: 'blogs', label: 'Journal & Blogs' },
          { id: 'faqs', label: 'FAQs' },
          { id: 'pages', label: 'Structured Pages' },
          { id: 'navigation', label: 'Navigation Menu' },
          { id: 'media', label: 'Media Library' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Hero Slides */}
      {activeTab === 'hero' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingHero(null); setIsHeroModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Hero Slide
            </Button>
          </div>
          <Table
            columns={heroColumns}
            data={heroData?.slides || []}
            keyExtractor={(row) => row.id}
            isLoading={heroLoading}
            emptyMessage="No hero carousel slides configured."
          />
        </div>
      )}

      {/* Categories & Subcategories */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-graphite-900">Taxonomy & Category Structure</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setEditingSubcategory(null); setIsSubcategoryModalOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Add Subcategory
              </Button>
              <Button size="sm" onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Add Main Category
              </Button>
            </div>
          </div>

          {categoriesLoading ? (
            <p className="py-8 text-center text-xs text-graphite-400">Loading category taxonomy...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(categoriesData?.categories || []).map((cat) => (
                <div key={cat.id} className="rounded-xl border border-graphite-200 bg-white p-5 space-y-4 shadow-2xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-graphite-900 text-base">{cat.name}</span>
                      <p className="text-xs font-mono text-graphite-400">/{cat.slug}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingCategory(cat); setIsCategoryModalOpen(true); }}
                        className="p-1 rounded text-graphite-400 hover:text-graphite-700 hover:bg-graphite-100"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingCategory(cat)}
                        className="p-1 rounded text-red-400 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {cat.image && (
                    <div className="h-24 w-full rounded-lg bg-graphite-100 overflow-hidden border border-graphite-100">
                      <img src={cat.image} alt={cat.name} className="h-full w-full object-cover" />
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-bold text-graphite-700 uppercase tracking-wider mb-2">Subcategories</h4>
                    <div className="space-y-1.5">
                      {!cat.subcategories || cat.subcategories.length === 0 ? (
                        <p className="text-xs text-graphite-400 italic">No subcategories defined.</p>
                      ) : (
                        cat.subcategories.map((sub) => (
                          <div key={sub.id} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-graphite-50 border border-graphite-100">
                            <div>
                              <span className="font-medium text-graphite-800">{sub.name}</span>
                              <span className="text-[10px] text-graphite-400 ml-1.5 font-mono">/{sub.slug}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => { setEditingSubcategory({ ...sub, categoryId: cat.id }); setIsSubcategoryModalOpen(true); }}
                                className="p-0.5 rounded text-graphite-400 hover:text-graphite-700"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => setDeletingSubcategory(sub)}
                                className="p-0.5 rounded text-red-400 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Customer Reviews */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingReview(null); setIsReviewModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Customer Review
            </Button>
          </div>
          <Table
            columns={reviewColumns}
            data={reviewsData?.reviews || []}
            keyExtractor={(row) => row.id}
            isLoading={reviewsLoading}
            emptyMessage="No customer reviews submitted."
          />
        </div>
      )}

      {/* Blogs */}
      {activeTab === 'blogs' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingBlog(null); setIsBlogModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Journal Article
            </Button>
          </div>
          <Table
            columns={blogColumns}
            data={blogsData?.posts || []}
            keyExtractor={(row) => row.id}
            isLoading={blogsLoading}
            emptyMessage="No journal blog posts published."
          />
        </div>
      )}

      {/* FAQs */}
      {activeTab === 'faqs' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingFaq(null); setIsFaqModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add FAQ Item
            </Button>
          </div>
          <Table
            columns={faqColumns}
            data={faqsData?.faqs || []}
            keyExtractor={(row) => row.id}
            isLoading={faqsLoading}
            emptyMessage="No FAQs created."
          />
        </div>
      )}

      {/* Structured Pages */}
      {activeTab === 'pages' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pagesLoading ? (
              <p className="col-span-full py-8 text-center text-xs text-graphite-400">Loading structured pages...</p>
            ) : (
              (pagesData?.pages || []).map((page) => (
                <div key={page.id} className="rounded-xl border border-graphite-200 bg-white p-5 flex items-start justify-between shadow-2xs">
                  <div>
                    <h3 className="font-bold text-graphite-900 text-sm">{page.title}</h3>
                    <p className="text-xs font-mono text-graphite-400">/{page.slug}</p>
                    <div className="mt-2">
                      <StatusBadge status={page.isPublished ? 'PUBLISHED' : 'DRAFT'} />
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingPage(page);
                      setIsPageModalOpen(true);
                    }}
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit Content
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Website Navigation */}
      {activeTab === 'navigation' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingNavItem(null); setIsNavModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Navigation Item
            </Button>
          </div>

          {navLoading ? (
            <p className="py-8 text-center text-xs text-graphite-400">Loading navigation menu...</p>
          ) : (
            <div className="rounded-xl border border-graphite-200 bg-white divide-y divide-graphite-100">
              {(navData?.navigation || []).map((item) => (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Navigation className="h-4 w-4 text-brand-700" />
                      <div>
                        <span className="font-bold text-graphite-900 text-sm">{item.label}</span>
                        <span className="text-xs font-mono text-graphite-400 ml-2">{item.href}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={item.isActive ? 'ACTIVE' : 'INACTIVE'} />
                      <Button size="sm" variant="outline" onClick={() => { setEditingNavItem(item); setIsNavModalOpen(true); }}>
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeletingNavItem(item)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {item.children && item.children.length > 0 && (
                    <div className="pl-7 space-y-1 border-l-2 border-graphite-100 ml-2">
                      {item.children.map((child) => (
                        <div key={child.id} className="flex items-center justify-between py-1 text-xs">
                          <div>
                            <span className="font-medium text-graphite-800">{child.label}</span>
                            <span className="font-mono text-graphite-400 ml-2">{child.href}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { setEditingNavItem(child); setIsNavModalOpen(true); }}
                              className="p-1 text-graphite-400 hover:text-graphite-700"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => setDeletingNavItem(child)}
                              className="p-1 text-red-400 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Media Library */}
      {activeTab === 'media' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-800">
              <Upload className="h-3.5 w-3.5" /> Upload Media File
              <input
                type="file"
                accept="image/*,video/mp4"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('folder', 'general');
                    try {
                      await apiClient.post('/media/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                      });
                      refetchMedia();
                    } catch (err) {
                      console.error('Failed to upload media', err);
                    }
                  }
                }}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {mediaLoading ? (
              <p className="col-span-full py-8 text-center text-xs text-graphite-400">Loading media library...</p>
            ) : !mediaData?.assets || mediaData.assets.length === 0 ? (
              <div className="col-span-full rounded-xl border border-graphite-200 bg-white p-12 text-center text-xs text-graphite-500">
                <ImageIcon className="mx-auto h-8 w-8 text-graphite-300 mb-2" />
                No media assets uploaded yet.
              </div>
            ) : (
              mediaData.assets.map((asset) => (
                <div key={asset.id} className="rounded-xl border border-graphite-200 bg-white overflow-hidden group shadow-2xs relative">
                  <div className="aspect-square bg-graphite-100 overflow-hidden">
                    <img src={asset.url} alt={asset.altText || asset.filename} className="h-full w-full object-cover" />
                  </div>
                  <div className="p-2 text-[11px] flex items-center justify-between">
                    <div className="truncate">
                      <p className="truncate font-semibold text-graphite-800">{asset.originalName || asset.filename}</p>
                      <p className="text-graphite-400 text-[10px]">{asset.folder || 'general'}</p>
                    </div>
                    <button
                      onClick={() => setDeletingMedia(asset)}
                      className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ---------------- HARDWARE MODALS ---------------- */}

      {/* Hero Slide Modal */}
      {isHeroModalOpen && (
        <HeroSlideModal
          slide={editingHero}
          isOpen={isHeroModalOpen}
          onClose={() => setIsHeroModalOpen(false)}
          onSaved={refetchHero}
        />
      )}

      {/* Review Modal */}
      {isReviewModalOpen && (
        <ReviewModal
          review={editingReview}
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          onSaved={refetchReviews}
        />
      )}

      {/* Blog Modal */}
      {isBlogModalOpen && (
        <BlogModal
          post={editingBlog}
          isOpen={isBlogModalOpen}
          onClose={() => setIsBlogModalOpen(false)}
          onSaved={refetchBlogs}
        />
      )}

      {/* FAQ Modal */}
      {isFaqModalOpen && (
        <FaqModal
          faq={editingFaq}
          categories={categoriesData?.categories || []}
          isOpen={isFaqModalOpen}
          onClose={() => setIsFaqModalOpen(false)}
          onSaved={refetchFaqs}
        />
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <CategoryModal
          category={editingCategory}
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          onSaved={refetchCategories}
        />
      )}

      {/* Subcategory Modal */}
      {isSubcategoryModalOpen && (
        <SubcategoryModal
          subcategory={editingSubcategory}
          categories={categoriesData?.categories || []}
          isOpen={isSubcategoryModalOpen}
          onClose={() => setIsSubcategoryModalOpen(false)}
          onSaved={refetchCategories}
        />
      )}

      {/* Navigation Modal */}
      {isNavModalOpen && (
        <NavModal
          item={editingNavItem}
          parentItems={navData?.navigation || []}
          isOpen={isNavModalOpen}
          onClose={() => setIsNavModalOpen(false)}
          onSaved={refetchNav}
        />
      )}

      {/* Page Content Modal */}
      {isPageModalOpen && (
        <PageModal
          page={editingPage}
          isOpen={isPageModalOpen}
          onClose={() => setIsPageModalOpen(false)}
          onSaved={refetchPages}
        />
      )}

      {/* Confirm Deletion Dialogs */}
      <ConfirmDialog
        isOpen={!!deletingHero}
        onClose={() => setDeletingHero(null)}
        onConfirm={handleDeleteHero}
        title="Delete Hero Slide"
        message={`Are you sure you want to delete "${deletingHero?.title}"?`}
        isLoading={isSubmitting}
      />

      <ConfirmDialog
        isOpen={!!deletingReview}
        onClose={() => setDeletingReview(null)}
        onConfirm={handleDeleteReview}
        title="Delete Review"
        message={`Are you sure you want to delete review by "${deletingReview?.name}"?`}
        isLoading={isSubmitting}
      />

      <ConfirmDialog
        isOpen={!!deletingBlog}
        onClose={() => setDeletingBlog(null)}
        onConfirm={handleDeleteBlog}
        title="Delete Blog Article"
        message={`Are you sure you want to delete article "${deletingBlog?.title}"?`}
        isLoading={isSubmitting}
      />

      <ConfirmDialog
        isOpen={!!deletingFaq}
        onClose={() => setDeletingFaq(null)}
        onConfirm={handleDeleteFaq}
        title="Delete FAQ Item"
        message={`Are you sure you want to delete question "${deletingFaq?.question}"?`}
        isLoading={isSubmitting}
      />

      <ConfirmDialog
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDeleteCategory}
        title="Delete Category"
        message={`Are you sure you want to delete category "${deletingCategory?.name}"?`}
        isLoading={isSubmitting}
      />

      <ConfirmDialog
        isOpen={!!deletingSubcategory}
        onClose={() => setDeletingSubcategory(null)}
        onConfirm={handleDeleteSubcategory}
        title="Delete Subcategory"
        message={`Are you sure you want to delete subcategory "${deletingSubcategory?.name}"?`}
        isLoading={isSubmitting}
      />

      <ConfirmDialog
        isOpen={!!deletingNavItem}
        onClose={() => setDeletingNavItem(null)}
        onConfirm={handleDeleteNavItem}
        title="Delete Navigation Item"
        message={`Are you sure you want to delete navigation item "${deletingNavItem?.label}"?`}
        isLoading={isSubmitting}
      />

      <ConfirmDialog
        isOpen={!!deletingMedia}
        onClose={() => setDeletingMedia(null)}
        onConfirm={handleDeleteMedia}
        title="Delete Media File"
        message={`Are you sure you want to delete media file "${deletingMedia?.originalName || deletingMedia?.filename}"?`}
        isLoading={isSubmitting}
      />
    </div>
  );
};

// ----------------------------------------------------
// SUB-MODAL COMPONENTS
// ----------------------------------------------------

const HeroSlideModal: React.FC<{ slide: HeroSlide | null; isOpen: boolean; onClose: () => void; onSaved: () => void }> = ({ slide, isOpen, onClose, onSaved }) => {
  const [title, setTitle] = useState(slide?.title || '');
  const [tagline, setTagline] = useState(slide?.tagline || '');
  const [image, setImage] = useState(slide?.image || '');
  const [cta, setCta] = useState(slide?.cta || 'Shop Collection');
  const [href, setHref] = useState(slide?.href || '/shop');
  const [sortOrder, setSortOrder] = useState(slide?.sortOrder || 0);
  const [isActive, setIsActive] = useState(slide?.isActive ?? true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = { title, tagline, image, cta, href, sortOrder: Number(sortOrder), isActive };
    try {
      if (slide) {
        await apiClient.put(`/cms/hero-slides/${slide.id}`, payload);
      } else {
        await apiClient.post('/cms/hero-slides', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={slide ? 'Edit Hero Slide' : 'Add Hero Slide'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Input label="Tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} />
        <Input label="Image URL" value={image} onChange={(e) => setImage(e.target.value)} required />
        <div className="grid grid-cols-2 gap-3">
          <Input label="CTA Button Text" value={cta} onChange={(e) => setCta(e.target.value)} />
          <Input label="Target Link (href)" value={href} onChange={(e) => setHref(e.target.value)} required />
        </div>
        <Input label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        <label className="flex items-center gap-2 text-xs font-semibold text-graphite-700 cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" />
          <span>Active Slide</span>
        </label>
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" isLoading={loading}>Save Slide</Button>
        </div>
      </form>
    </Modal>
  );
};

const ReviewModal: React.FC<{ review: Review | null; isOpen: boolean; onClose: () => void; onSaved: () => void }> = ({ review, isOpen, onClose, onSaved }) => {
  const [name, setName] = useState(review?.name || '');
  const [location, setLocation] = useState(review?.location || '');
  const [quote, setQuote] = useState(review?.quote || '');
  const [rating, setRating] = useState(review?.rating || 5);
  const [productName, setProductName] = useState(review?.productName || '');
  const [verified, setVerified] = useState(review?.verified ?? true);
  const [isPublished, setIsPublished] = useState(review?.isPublished ?? true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = { name, location, quote, rating: Number(rating), productName, verified, isPublished };
    try {
      if (review) {
        await apiClient.put(`/cms/reviews/${review.id}`, payload);
      } else {
        await apiClient.post('/cms/reviews', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={review ? 'Edit Review' : 'Add Review'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Client Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <Input label="Product Name" value={productName} onChange={(e) => setProductName(e.target.value)} />
        <Select
          label="Rating (1-5 Stars)"
          value={String(rating)}
          onChange={(e) => setRating(Number(e.target.value))}
          options={[1, 2, 3, 4, 5].map((r) => ({ value: String(r), label: `${r} Stars` }))}
        />
        <div>
          <label className="block text-xs font-semibold text-graphite-700 mb-1">Quote / Review</label>
          <textarea rows={3} value={quote} onChange={(e) => setQuote(e.target.value)} required className="w-full rounded-lg border p-2 text-xs" />
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="h-4 w-4" />
            <span>Verified Purchase</span>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4" />
            <span>Published</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" isLoading={loading}>Save Review</Button>
        </div>
      </form>
    </Modal>
  );
};

const BlogModal: React.FC<{ post: BlogPost | null; isOpen: boolean; onClose: () => void; onSaved: () => void }> = ({ post, isOpen, onClose, onSaved }) => {
  const [title, setTitle] = useState(post?.title || '');
  const [slug, setSlug] = useState(post?.slug || '');
  const [excerpt, setExcerpt] = useState(post?.excerpt || '');
  const [body, setBody] = useState(post?.body || '');
  const [imageUrl, setImageUrl] = useState(post?.imageUrl || '');
  const [isPublished, setIsPublished] = useState(post?.isPublished ?? false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const blogSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const payload = { title, slug: blogSlug, excerpt, body, imageUrl, isPublished };
    try {
      if (post) {
        await apiClient.put(`/cms/blog-posts/${post.id}`, payload);
      } else {
        await apiClient.post('/cms/blog-posts', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={post ? 'Edit Blog Article' : 'Add Blog Article'} maxWidth="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Input label="URL Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <Input label="Cover Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
        <Input label="Excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        <div>
          <label className="block text-xs font-semibold text-graphite-700 mb-1">Article Content Body</label>
          <textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} className="w-full rounded-lg border p-2 text-xs" />
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4" />
          <span>Publish Article</span>
        </label>
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" isLoading={loading}>Save Article</Button>
        </div>
      </form>
    </Modal>
  );
};

const FaqModal: React.FC<{ faq: FAQ | null; categories: ProductCategory[]; isOpen: boolean; onClose: () => void; onSaved: () => void }> = ({ faq, isOpen, onClose, onSaved }) => {
  const [question, setQuestion] = useState(faq?.question || '');
  const [answer, setAnswer] = useState(faq?.answer || '');
  const [context, setContext] = useState(faq?.context || 'GENERAL');
  const [isPublished, setIsPublished] = useState(faq?.isPublished ?? true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Ensure valid FAQCategory ID exists
    const categoriesRes = await apiClient.get('/cms/faq-categories');
    const existingCats = categoriesRes.data.data?.categories || categoriesRes.data?.categories || [];
    let catId = existingCats[0]?.id;
    if (!catId) {
      const newCat = await apiClient.post('/cms/faq-categories', { name: 'General' });
      catId = newCat.data.data?.id || newCat.data?.id;
    }

    const payload = { categoryId: catId, question, answer, context, isPublished };
    try {
      if (faq) {
        await apiClient.put(`/cms/faqs/${faq.id}`, payload);
      } else {
        await apiClient.post('/cms/faqs', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={faq ? 'Edit FAQ Item' : 'Add FAQ Item'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Question" value={question} onChange={(e) => setQuestion(e.target.value)} required />
        <Select
          label="Context / Section"
          value={context}
          onChange={(e) => setContext(e.target.value as any)}
          options={[
            { value: 'GENERAL', label: 'General' },
            { value: 'PRODUCT', label: 'Product' },
            { value: 'DIAMOND_EDUCATION', label: 'Diamond Education' },
            { value: 'CUSTOMISE', label: 'Customise' },
            { value: 'GIFTING', label: 'Gifting' },
            { value: 'COLLECTION', label: 'Collection' },
          ]}
        />
        <div>
          <label className="block text-xs font-semibold text-graphite-700 mb-1">Answer</label>
          <textarea rows={4} value={answer} onChange={(e) => setAnswer(e.target.value)} required className="w-full rounded-lg border p-2 text-xs" />
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4" />
          <span>Published</span>
        </label>
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" isLoading={loading}>Save FAQ</Button>
        </div>
      </form>
    </Modal>
  );
};

const CategoryModal: React.FC<{ category: ProductCategory | null; isOpen: boolean; onClose: () => void; onSaved: () => void }> = ({ category, isOpen, onClose, onSaved }) => {
  const [name, setName] = useState(category?.name || '');
  const [slug, setSlug] = useState(category?.slug || '');
  const [image, setImage] = useState(category?.image || '');
  const [sortOrder, setSortOrder] = useState(category?.sortOrder || 0);
  const [isPublished, setIsPublished] = useState(category?.isPublished ?? true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const catSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const payload = { name, slug: catSlug, image, sortOrder: Number(sortOrder), isPublished };
    try {
      if (category) {
        await apiClient.put(`/categories/${category.id}`, payload);
      } else {
        await apiClient.post('/categories', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={category ? 'Edit Category' : 'Add Category'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Category Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="URL Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <Input label="Category Image URL" value={image} onChange={(e) => setImage(e.target.value)} />
        <Input label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4" />
          <span>Published</span>
        </label>
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" isLoading={loading}>Save Category</Button>
        </div>
      </form>
    </Modal>
  );
};

const SubcategoryModal: React.FC<{ subcategory: Subcategory | null; categories: ProductCategory[]; isOpen: boolean; onClose: () => void; onSaved: () => void }> = ({ subcategory, categories, isOpen, onClose, onSaved }) => {
  const [categoryId, setCategoryId] = useState(subcategory?.categoryId || categories[0]?.id || '');
  const [name, setName] = useState(subcategory?.name || '');
  const [slug, setSlug] = useState(subcategory?.slug || '');
  const [sortOrder, setSortOrder] = useState(subcategory?.sortOrder || 0);
  const [isPublished, setIsPublished] = useState(subcategory?.isPublished ?? true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const subSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const payload = { categoryId, name, slug: subSlug, sortOrder: Number(sortOrder), isPublished };
    try {
      if (subcategory) {
        await apiClient.put(`/categories/subcategories/${subcategory.id}`, payload);
      } else {
        await apiClient.post('/categories/subcategories', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={subcategory ? 'Edit Subcategory' : 'Add Subcategory'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Parent Category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          required
        />
        <Input label="Subcategory Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="URL Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <Input label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4" />
          <span>Published</span>
        </label>
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" isLoading={loading}>Save Subcategory</Button>
        </div>
      </form>
    </Modal>
  );
};

const NavModal: React.FC<{ item: NavigationItem | null; parentItems: NavigationItem[]; isOpen: boolean; onClose: () => void; onSaved: () => void }> = ({ item, parentItems, isOpen, onClose, onSaved }) => {
  const [label, setLabel] = useState(item?.label || '');
  const [href, setHref] = useState(item?.href || '');
  const [parentId, setParentId] = useState(item?.parentId || '');
  const [sortOrder, setSortOrder] = useState(item?.sortOrder || 0);
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = { label, href, parentId: parentId || null, sortOrder: Number(sortOrder), isActive };
    try {
      if (item) {
        await apiClient.put(`/cms/navigation/${item.id}`, payload);
      } else {
        await apiClient.post('/cms/navigation', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={item ? 'Edit Navigation Item' : 'Add Navigation Item'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Label" value={label} onChange={(e) => setLabel(e.target.value)} required />
        <Input label="Href / Link Target" value={href} onChange={(e) => setHref(e.target.value)} required />
        <Select
          label="Parent Navigation Item (Optional)"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          options={[
            { value: '', label: 'None (Top Level Root)' },
            ...parentItems.filter((p) => p.id !== item?.id).map((p) => ({ value: p.id, label: p.label })),
          ]}
        />
        <Input label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" />
          <span>Active</span>
        </label>
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" isLoading={loading}>Save Item</Button>
        </div>
      </form>
    </Modal>
  );
};

const PageModal: React.FC<{ page: any | null; isOpen: boolean; onClose: () => void; onSaved: () => void }> = ({ page, isOpen, onClose, onSaved }) => {
  const [title, setTitle] = useState(page?.title || '');
  const [contentJson, setContentJson] = useState(JSON.stringify(page?.content || {}, null, 2));
  const [isPublished, setIsPublished] = useState(page?.isPublished ?? true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    let parsedContent = {};
    try {
      parsedContent = JSON.parse(contentJson);
    } catch (ex) {
      setErr('Invalid JSON syntax in Page Content.');
      return;
    }
    setLoading(true);
    try {
      await apiClient.put(`/cms/pages/${page.slug}`, {
        title,
        content: parsedContent,
        isPublished,
      });
      onSaved();
      onClose();
    } catch (error: any) {
      setErr(error.response?.data?.message || 'Failed to save page content.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit Page: ${page?.title}`} maxWidth="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {err && <div className="rounded bg-red-50 p-2.5 text-xs text-red-700">{err}</div>}
        <Input label="Page Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <div>
          <label className="block text-xs font-semibold text-graphite-700 mb-1">Structured Content (JSON Format)</label>
          <textarea
            rows={10}
            value={contentJson}
            onChange={(e) => setContentJson(e.target.value)}
            className="w-full rounded-lg border p-2.5 text-xs font-mono text-graphite-900 bg-graphite-50"
          />
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4" />
          <span>Published on Storefront</span>
        </label>
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" isLoading={loading}>Save Page Content</Button>
        </div>
      </form>
    </Modal>
  );
};
